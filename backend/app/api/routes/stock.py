from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.models.product import Product
from app.models.stock_receipt import StockReceipt, StockReceiptItem
from app.models.stock_transaction import StockTransaction
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
        total_cases=request.total_cases or 0,
        total_bottles=0,
        total_amount=request.net_amount or request.grand_total or 0.0,
        imfs_subtotal=request.imfs_subtotal or 0.0,
        beer_subtotal=request.beer_subtotal or 0.0,
        second_sale_tax=request.second_sale_tax or 0.0,
        grand_total=request.grand_total or 0.0,
        tcs_tax=request.tcs_tax or 0.0,
        net_amount=request.net_amount or 0.0,
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

        # TASMAC Invoice Exact Calculations (Matches Printed Bill)
        line_amount = (rate_case * c_qty) + ((rate_case / pack) * b_loose if pack > 0 else 0.0)
        calc_basic_cost = round(rate_case / pack, 2) if pack > 0 else 0.0
        tcs_amt = line_amount * 0.02
        total_line_cost = round(line_amount, 2)

        grand_total_amount += total_line_cost

        # Find or match Product in DB
        prod = None
        if item.product_id:
            prod = db.query(Product).filter(Product.id == item.product_id).first()

        if not prod:
            # Match by name
            prod = db.query(Product).filter(Product.name.ilike(f"%{p_name}%")).first()

        if not prod:
            # Clean name matching
            clean_name = p_name.strip()
            # Try to get default brand_id
            from app.models.brand import Brand
            brand = db.query(Brand).first()
            if not brand:
                brand = Brand(name="TASMAC", description="Default Brand for Bulk Stock Imports")
                db.add(brand)
                db.flush()
            b_id = brand.id
            
            # Create product if missing
            prod = Product(
                brand_id=b_id,
                name=clean_name if clean_name.lower().endswith('ml') else f"{clean_name} {pack}pack",
                category="Liquor",
                volume_ml=180 if pack == 48 else (375 if pack == 24 else 750),
                unit="ml",
                selling_price=item.selling_price if item.selling_price and item.selling_price > 0 else (item.mrp if item.mrp and item.mrp > 0 else calc_basic_cost * 1.2),
                mrp=item.mrp or calc_basic_cost,
                basic_rate=calc_basic_cost,
                is_active=True
            )
            db.add(prod)
            db.flush()

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

    receipt.total_cases = request.total_cases if (request.total_cases and request.total_cases > 0) else total_cases
    receipt.total_bottles = total_bottles
    receipt.total_amount = request.net_amount if (request.net_amount and request.net_amount > 0) else round(grand_total_amount, 2)
    db.commit()

    return {
        "message": f"Successfully imported TASMAC stock for invoice {receipt.invoice_number}",
        "receipt_id": receipt.id,
        "total_cases": receipt.total_cases,
        "total_bottles": total_bottles,
        "total_amount": float(receipt.total_amount),
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
            "total_amount": float(r.net_amount or r.total_amount or 0),
            "imfs_subtotal": float(r.imfs_subtotal or 0),
            "beer_subtotal": float(r.beer_subtotal or 0),
            "second_sale_tax": float(r.second_sale_tax or 0),
            "grand_total": float(r.grand_total or 0),
            "tcs_tax": float(r.tcs_tax or 0),
            "net_amount": float(r.net_amount or r.total_amount or 0),
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


@router.post(
    "/reset-inventory",
    status_code=status.HTTP_200_OK,
)
def reset_all_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Clears all stock arrival logs, receipt items, and soft-deletes all IN stock transactions.
    Resets net available stock for all products back to 0.
    """
    db.query(StockTransaction).filter(
        StockTransaction.transaction_type == "IN",
        StockTransaction.is_deleted == False,
    ).update({"is_deleted": True}, synchronize_session=False)

    db.query(StockReceiptItem).delete(synchronize_session=False)
    db.query(StockReceipt).delete(synchronize_session=False)
    db.commit()
    return {"message": "All stock arrival logs and available bottle inventory have been completely reset to 0."}


@router.delete(
    "/receipts",
    status_code=status.HTTP_200_OK,
)
def clear_all_stock_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    receipts = db.query(StockReceipt).all()
    count = len(receipts)
    
    # Soft-delete all IN stock transactions so available stock drops back
    db.query(StockTransaction).filter(
        StockTransaction.transaction_type == "IN",
        StockTransaction.is_deleted == False,
    ).update({"is_deleted": True}, synchronize_session=False)

    db.query(StockReceiptItem).delete(synchronize_session=False)
    db.query(StockReceipt).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted all {count} stock arrival logs and reset all associated available stock bottles."}


@router.delete(
    "/receipts/{receipt_id}",
    status_code=status.HTTP_200_OK,
)
def delete_stock_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    receipt = db.query(StockReceipt).filter(StockReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock receipt log not found",
        )
    
    # Deduct stock IN quantities associated with this arrival log
    for item in receipt.items:
        if item.product_id and item.total_bottles > 0:
            txs = (
                db.query(StockTransaction)
                .filter(
                    StockTransaction.product_id == item.product_id,
                    StockTransaction.transaction_type == "IN",
                    StockTransaction.is_deleted == False,
                )
                .order_by(StockTransaction.id.desc())
                .all()
            )
            needed = item.total_bottles
            for tx in txs:
                if needed <= 0:
                    break
                if tx.quantity <= needed:
                    needed -= tx.quantity
                    tx.is_deleted = True
                else:
                    tx.quantity -= needed
                    needed = 0
                db.add(tx)

    db.delete(receipt)
    db.commit()
    return {"message": f"Stock arrival receipt #{receipt_id} and associated stock bottles deleted successfully"}