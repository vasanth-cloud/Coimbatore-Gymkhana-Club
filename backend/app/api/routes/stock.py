from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.models.product import Product
from app.models.stock_receipt import StockReceipt, StockReceiptItem
from app.repositories.stock_repository import StockRepository

from app.schemas.stock import (
    StockReceiveRequest,
    StockBulkReceiveItem,
    StockTransactionResponse,
    CurrentStockResponse,
    TASMACImportRequest,
)

from app.services.stock_service import StockService


router = APIRouter(
    prefix="/stock",
    tags=["Stock Management"],
)


@router.post(
    "/receive",
    response_model=StockTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_stock(
    request: StockReceiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = StockService(db)

    try:
        return service.receive_stock(
            product_id=request.product_id,
            quantity=request.quantity,
            transaction_date=request.transaction_date,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/bulk-receive",
    status_code=status.HTTP_201_CREATED,
)
def bulk_receive_stock(
    items: list[StockBulkReceiveItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = StockService(db)
    received_count = 0
    for item in items:
        try:
            service.receive_stock(
                product_id=item.product_id,
                quantity=item.quantity,
                transaction_date=item.transaction_date,
            )
            received_count += 1
        except Exception as e:
            print(f"Bulk receive error for product {item.product_id}:", e)
    return {"message": f"Successfully imported incoming stock for {received_count} items"}


@router.post(
    "/tasmac-import",
    status_code=status.HTTP_201_CREATED,
)
def import_tasmac_stock(
    request: TASMACImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    try:
        inv_date = datetime.strptime(request.invoice_date, "%Y-%m-%d").date()
    except Exception:
        inv_date = date.today()

    total_cases = 0
    total_bottles = 0
    grand_total_amount = 0.0

    service = StockService(db)

    receipt = StockReceipt(
        invoice_number=request.invoice_number or f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        invoice_date=inv_date,
        depot_name=request.depot_name or "TASMAC COIMBATORE (SOUTH)",
        supplier_name=request.supplier_name or "TASMAC LTD",
        file_name=request.file_name or "Bulk Import",
        received_by=getattr(current_user, "full_name", "Staff"),
        total_cases=0,
        total_bottles=0,
        total_amount=0.0,
    )
    db.add(receipt)
    db.flush()

    receipt_items = []

    for item in request.items:
        if not item.product_name or str(item.product_name).strip() == "":
            continue

        p_name = item.product_name.strip()
        pack = item.pack_size if item.pack_size > 0 else 24
        c_qty = max(0, item.cases)
        b_loose = max(0, item.loose_bottles)
        t_bottles = (c_qty * pack) + b_loose

        if t_bottles <= 0:
            continue

        total_cases += c_qty
        total_bottles += t_bottles

        rate_case = max(0.0, item.rate_per_case)
        added_val_pct = max(0.0, item.added_value_percent)

        # TASMAC Formula Calculations
        base_amt = (rate_case / pack) * t_bottles if pack > 0 else rate_case * c_qty
        added_val_amt = base_amt * (added_val_pct / 100.0)
        tcs_amt = (base_amt + added_val_amt) * 0.02
        total_line_cost = base_amt + added_val_amt + tcs_amt
        calc_basic_cost = round(total_line_cost / t_bottles, 2) if t_bottles > 0 else 0.0

        grand_total_amount += total_line_cost

        # Find or match Product in DB
        prod = None
        if item.product_id:
            prod = db.query(Product).filter(Product.id == item.product_id).first()

        if not prod:
            # Match by name
            prod = db.query(Product).filter(Product.name.ilike(f"%{p_name}%")).first()

        if prod:
            # Update product basic rate and prices if provided
            prod.basic_rate = calc_basic_cost
            if item.mrp and item.mrp > 0:
                prod.mrp = item.mrp
            if item.selling_price and item.selling_price > 0:
                prod.selling_price = item.selling_price
            db.add(prod)

            # Record stock receiving transaction
            service.receive_stock(
                product_id=prod.id,
                quantity=t_bottles,
                transaction_date=datetime.combine(inv_date, datetime.min.time()),
            )

        # Create Receipt Item
        rc_item = StockReceiptItem(
            receipt_id=receipt.id,
            product_id=prod.id if prod else None,
            product_name=p_name,
            pack_size=pack,
            cases=c_qty,
            loose_bottles=b_loose,
            total_bottles=t_bottles,
            rate_per_case=rate_case,
            added_value_percent=added_val_pct,
            tcs_amount=round(tcs_amt, 2),
            total_line_cost=round(total_line_cost, 2),
            calculated_basic_cost=calc_basic_cost,
            mrp=item.mrp or (prod.mrp if prod else 0.0),
            selling_price=item.selling_price or (prod.selling_price if prod else 0.0),
        )
        db.add(rc_item)
        receipt_items.append(rc_item)

    receipt.total_cases = total_cases
    receipt.total_bottles = total_bottles
    receipt.total_amount = round(grand_total_amount, 2)
    db.commit()

    return {
        "message": f"Successfully imported TASMAC stock for invoice {receipt.invoice_number}",
        "receipt_id": receipt.id,
        "total_cases": total_cases,
        "total_bottles": total_bottles,
        "total_amount": round(grand_total_amount, 2),
        "items_count": len(receipt_items),
    }


@router.get(
    "/receipts",
)
def get_stock_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    receipts = db.query(StockReceipt).order_by(StockReceipt.invoice_date.desc(), StockReceipt.id.desc()).all()
    res = []
    for r in receipts:
        items_data = []
        for i in r.items:
            items_data.append({
                "id": i.id,
                "product_name": i.product_name,
                "pack_size": i.pack_size,
                "cases": i.cases,
                "loose_bottles": i.loose_bottles,
                "total_bottles": i.total_bottles,
                "rate_per_case": float(i.rate_per_case or 0),
                "added_value_percent": float(i.added_value_percent or 0),
                "tcs_amount": float(i.tcs_amount or 0),
                "total_line_cost": float(i.total_line_cost or 0),
                "calculated_basic_cost": float(i.calculated_basic_cost or 0),
                "mrp": float(i.mrp or 0),
                "selling_price": float(i.selling_price or 0),
            })

        res.append({
            "id": r.id,
            "invoice_number": r.invoice_number,
            "invoice_date": r.invoice_date.strftime("%Y-%m-%d") if r.invoice_date else None,
            "depot_name": r.depot_name,
            "supplier_name": r.supplier_name,
            "total_cases": r.total_cases,
            "total_bottles": r.total_bottles,
            "total_amount": float(r.total_amount or 0),
            "file_name": r.file_name,
            "received_by": r.received_by,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
            "items": items_data,
        })
    return res


@router.get(
    "/ledger",
)
def get_daily_stock_ledger(
    report_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    if report_date is None:
        report_date = date.today()

    repo = StockRepository(db)
    return repo.get_daily_stock_ledger(report_date)


@router.get(
    "/transactions",
    response_model=list[StockTransactionResponse],
)
def get_stock_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = StockService(db)
    return service.get_transactions()


@router.get(
    "/current/{product_id}",
    response_model=CurrentStockResponse,
)
def get_current_stock(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = StockService(db)

    try:
        return service.get_current_stock(product_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/current",
    response_model=list[CurrentStockResponse],
)
def get_all_current_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = StockService(db)
    return service.get_all_current_stock()