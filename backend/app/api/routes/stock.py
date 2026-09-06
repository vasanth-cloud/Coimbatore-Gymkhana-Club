from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
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
        tx = service.receive_stock(
            product_id=request.product_id,
            quantity=request.quantity,
            transaction_date=request.transaction_date,
        )

        # Log Arrival Audit Receipt for Quick Receive
        prod = db.query(Product).filter(Product.id == request.product_id).first()
        if prod:
            pack = prod.pack_size or (48 if (prod.volume_ml and prod.volume_ml <= 180) else (24 if prod.volume_ml == 375 else 12))
            c_qty = request.quantity // pack
            b_loose = request.quantity % pack
            inv_date = request.transaction_date.date() if request.transaction_date else date.today()

            receipt = StockReceipt(
                invoice_number=f"RCV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                invoice_date=inv_date,
                depot_name="DIRECT RECEIPT",
                supplier_name="DIRECT SUPPLIER",
                file_name="Quick Receive",
                received_by=getattr(current_user, "full_name", "Staff"),
                total_cases=c_qty,
                total_bottles=request.quantity,
                total_amount=round(float(prod.basic_rate or 0.0) * request.quantity, 2),
                grand_total=round(float(prod.basic_rate or 0.0) * request.quantity, 2),
                net_amount=round(float(prod.basic_rate or 0.0) * request.quantity, 2),
            )
            db.add(receipt)
            db.flush()

            rc_item = StockReceiptItem(
                receipt_id=receipt.id,
                product_id=prod.id,
                product_name=prod.name,
                pack_size=pack,
                cases=c_qty,
                loose_bottles=b_loose,
                total_bottles=request.quantity,
                rate_per_case=round(float(prod.basic_rate or 0.0) * pack, 2),
                added_value_percent=220.0,
                total_line_cost=round(float(prod.basic_rate or 0.0) * request.quantity, 2),
                calculated_basic_cost=float(prod.basic_rate or 0.0),
                mrp=float(prod.mrp or 0.0),
                selling_price=float(prod.selling_price or 0.0),
            )
            db.add(rc_item)
            db.commit()

        return tx

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

    receipt = StockReceipt(
        invoice_number=f"BLK-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        invoice_date=date.today(),
        depot_name="BULK RECEIPT",
        supplier_name="DIRECT SUPPLIER",
        file_name="Bulk Receive",
        received_by=getattr(current_user, "full_name", "Staff"),
        total_cases=0,
        total_bottles=0,
        total_amount=0.0,
    )
    db.add(receipt)
    db.flush()

    tot_cases = 0
    tot_bottles = 0
    tot_amount = 0.0

    for item in items:
        try:
            service.receive_stock(
                product_id=item.product_id,
                quantity=item.quantity,
                transaction_date=item.transaction_date,
            )
            received_count += 1

            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                pack = prod.pack_size or (48 if (prod.volume_ml and prod.volume_ml <= 180) else (24 if prod.volume_ml == 375 else 12))
                c_qty = item.quantity // pack
                b_loose = item.quantity % pack
                line_val = round(float(prod.basic_rate or 0.0) * item.quantity, 2)

                tot_cases += c_qty
                tot_bottles += item.quantity
                tot_amount += line_val

                rc_item = StockReceiptItem(
                    receipt_id=receipt.id,
                    product_id=prod.id,
                    product_name=prod.name,
                    pack_size=pack,
                    cases=c_qty,
                    loose_bottles=b_loose,
                    total_bottles=item.quantity,
                    rate_per_case=round(float(prod.basic_rate or 0.0) * pack, 2),
                    added_value_percent=220.0,
                    total_line_cost=line_val,
                    calculated_basic_cost=float(prod.basic_rate or 0.0),
                    mrp=float(prod.mrp or 0.0),
                    selling_price=float(prod.selling_price or 0.0),
                )
                db.add(rc_item)
        except Exception as e:
            print(f"Bulk receive error for product {item.product_id}:", e)

    receipt.total_cases = tot_cases
    receipt.total_bottles = tot_bottles
    receipt.total_amount = tot_amount
    receipt.net_amount = tot_amount
    receipt.grand_total = tot_amount
    db.commit()

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
        inv_date = date.today()
        if request.invoice_date:
            raw_d = str(request.invoice_date).split("T")[0].strip()
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
                try:
                    inv_date = datetime.strptime(raw_d, fmt).date()
                    break
                except Exception:
                    pass

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
            pack = item.pack_size if item.pack_size and item.pack_size > 0 else 24
            c_qty = max(0, item.cases or 0)
            b_loose = max(0, item.loose_bottles or 0)
            t_bottles = (c_qty * pack) + b_loose

            if t_bottles <= 0:
                continue

            total_cases += c_qty
            total_bottles += t_bottles

            rate_case = max(0.0, item.rate_per_case or 0.0)
            added_val_pct = float(item.added_value_percent) if (item.added_value_percent is not None and float(item.added_value_percent) > 0) else 220.0

            # TASMAC Invoice Exact Calculations & Basic Rate Formula
            line_amount = (rate_case * c_qty) + ((rate_case / pack) * b_loose if pack > 0 else 0.0)

            # User's Step-by-Step Formula:
            # 1. output1 = added_value_rs * (added_value_percent / 100)
            # 2. output2 = output1 + line_amount
            # 3. output3 = output2 * 0.02
            # 4. output4 = output2 + output3
            # 5. basic_rate_per_bottle = output4 / total_bottles
            added_val_rs = item.added_value_rs if (item.added_value_rs and item.added_value_rs > 0) else (line_amount * 0.3697)
            out1 = added_val_rs * (added_val_pct / 100.0)
            out2 = out1 + line_amount
            out3 = out2 * 0.02
            out4 = out2 + out3

            calc_basic_cost = round(out4 / t_bottles, 2) if t_bottles > 0 else 0.0
            tcs_amt = out3
            total_line_cost = round(out4, 2)

            grand_total_amount += total_line_cost

            # Determine volume and pack size
            item_vol = item.volume_ml if (item.volume_ml and item.volume_ml > 0) else (180 if pack == 48 else (375 if pack == 24 else 750))

            # Multi-tier bulletproof product matcher
            prod = None
            if item.product_id and item.product_id > 0:
                prod = db.query(Product).filter(Product.id == item.product_id, Product.is_deleted == False).first()

            clean_pname = p_name.replace(" 48pack", "").replace(" 24pack", "").replace(" 12pack", "").strip()

            # Format product name with volume specifier if not present to ensure size distinctness
            if any(v in clean_pname.lower() for v in ["180", "375", "750", "1000", "650", "ml"]):
                formatted_name = clean_pname
            else:
                formatted_name = f"{clean_pname} {item_vol}ml"

            if not prod and clean_pname:
                # 1. Exact formatted name match
                prod = db.query(Product).filter(func.lower(Product.name) == formatted_name.lower(), Product.is_deleted == False).first()

            if not prod and clean_pname:
                # 2. Match clean name with exact volume_ml
                prod = db.query(Product).filter(
                    func.lower(Product.name) == clean_pname.lower(),
                    Product.volume_ml == item_vol,
                    Product.is_deleted == False
                ).first()

            if not prod and clean_pname:
                # 3. Match parenthesized volume format
                prod = db.query(Product).filter(
                    func.lower(Product.name) == f"{clean_pname.lower()} ({item_vol}ml)",
                    Product.is_deleted == False
                ).first()

            if not prod:
                # 4. Create new distinct product for this exact brand and size
                from app.models.brand import Brand
                
                # Category detection
                c_upper = clean_pname.upper()
                if "BEER" in c_upper:
                    cat = "Beer"
                elif "WINE" in c_upper:
                    cat = "Wine"
                elif "VODKA" in c_upper:
                    cat = "Vodka"
                elif "RUM" in c_upper:
                    cat = "Rum"
                elif "WHISKY" in c_upper:
                    cat = "Whisky"
                elif "BRANDY" in c_upper:
                    cat = "Brandy"
                else:
                    cat = "Spirits"

                brand = db.query(Brand).filter(Brand.name.ilike("TASMAC")).first()
                if not brand:
                    brand = Brand(name="TASMAC", category="Liquor")
                    db.add(brand)
                    db.flush()
                b_id = brand.id

                # Default MRP & Selling Price to 0.0 unless specified so user can add in edit modal
                calc_mrp = item.mrp if (item.mrp and item.mrp > 0) else 0.0
                calc_sp = item.selling_price if (item.selling_price and item.selling_price > 0) else 0.0

                prod = Product(
                    brand_id=b_id,
                    name=formatted_name,
                    category=cat,
                    volume_ml=item_vol,
                    unit="bottle",
                    selling_price=calc_sp,
                    mrp=calc_mrp,
                    basic_rate=calc_basic_cost,
                    pack_size=pack,
                    is_active=True,
                    is_deleted=False
                )
                db.add(prod)
                db.flush()

            # Update product basic rate and prices if provided
            if calc_basic_cost > 0:
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
                product_name=prod.name if prod else (f"{p_name} {item_vol}ml" if "ml" not in p_name.lower() else p_name),
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
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import stock arrival: {str(e)}",
        )


@router.get(
    "/receipts",
)
def get_stock_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    try:
        # Auto-backfill receipts for active catalog products if no receipt items exist
        receipt_item_count = db.query(StockReceiptItem).count()
        active_products = db.query(Product).filter(Product.is_deleted == False).all()

        if receipt_item_count == 0 and active_products:
            # Clear out any empty orphan receipts
            db.query(StockReceiptItem).delete(synchronize_session=False)
            db.query(StockReceipt).delete(synchronize_session=False)
            db.commit()

            repo = StockRepository(db)
            receipt = StockReceipt(
                invoice_number=f"INITIAL-CATALOG-{date.today().strftime('%Y%m%d')}",
                invoice_date=date.today(),
                depot_name="TASMAC COIMBATORE (SOUTH)",
                supplier_name="TASMAC LTD / CATALOG STOCK",
                file_name="Initial Catalog Stock Audit Sync",
                received_by="System Admin",
                total_cases=0,
                total_bottles=0,
                total_amount=0.0,
            )
            db.add(receipt)
            db.flush()

            tot_cases = 0
            tot_bottles = 0
            tot_amt = 0.0

            for prod in active_products:
                cur_stk = repo.get_current_stock(prod.id)
                pack = prod.pack_size or (48 if (prod.volume_ml and prod.volume_ml <= 180) else (24 if prod.volume_ml == 375 else 12))
                qty = cur_stk if cur_stk > 0 else pack
                c_qty = qty // pack
                b_loose = qty % pack
                line_val = round(float(prod.basic_rate or 0.0) * qty, 2)

                tot_cases += c_qty if c_qty > 0 else 1
                tot_bottles += qty
                tot_amt += line_val

                rc_item = StockReceiptItem(
                    receipt_id=receipt.id,
                    product_id=prod.id,
                    product_name=prod.name,
                    pack_size=pack,
                    cases=c_qty if c_qty > 0 else 1,
                    loose_bottles=b_loose,
                    total_bottles=qty,
                    rate_per_case=round(float(prod.basic_rate or 0.0) * pack, 2),
                    added_value_percent=220.0,
                    total_line_cost=line_val,
                    calculated_basic_cost=float(prod.basic_rate or 0.0),
                    mrp=float(prod.mrp or 0.0),
                    selling_price=float(prod.selling_price or 0.0),
                )
                db.add(rc_item)

            receipt.total_cases = tot_cases
            receipt.total_bottles = tot_bottles
            receipt.total_amount = round(tot_amt, 2)
            receipt.net_amount = round(tot_amt, 2)
            receipt.grand_total = round(tot_amt, 2)
            db.commit()

        receipts = db.query(StockReceipt).order_by(StockReceipt.invoice_date.desc(), StockReceipt.id.desc()).all()
        res = []
        for r in receipts:
            items_data = []
            for i in r.items:
                prod_obj = getattr(i, "product", None)
                p_raw = str(i.product_name or (prod_obj.name if prod_obj else "UNNAMED ITEM"))
                v_ml = prod_obj.volume_ml if (prod_obj and prod_obj.volume_ml) else (180 if i.pack_size == 48 else (375 if i.pack_size == 24 else 750))
                p_displayName = p_raw if any(v in p_raw.lower() for v in ["ml", "180", "375", "750", "1000", "650"]) else f"{p_raw} {v_ml}ml"
                items_data.append({
                    "id": i.id,
                    "product_name": p_displayName,
                    "volume_ml": v_ml,
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
                "invoice_number": r.invoice_number or f"INV-{r.id}",
                "invoice_date": r.invoice_date.strftime("%Y-%m-%d") if r.invoice_date else date.today().strftime("%Y-%m-%d"),
                "depot_name": r.depot_name or "TASMAC DEPOT",
                "supplier_name": r.supplier_name or "TASMAC LTD",
                "total_cases": r.total_cases or 0,
                "total_bottles": r.total_bottles or 0,
                "total_amount": float(r.net_amount or r.total_amount or 0),
                "imfs_subtotal": float(r.imfs_subtotal or 0),
                "beer_subtotal": float(r.beer_subtotal or 0),
                "second_sale_tax": float(r.second_sale_tax or 0),
                "grand_total": float(r.grand_total or 0),
                "tcs_tax": float(r.tcs_tax or 0),
                "net_amount": float(r.net_amount or r.total_amount or 0),
                "file_name": r.file_name or "Stock Arrival Log",
                "received_by": r.received_by or "Staff",
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
                "items": items_data,
            })
        return res
    except Exception as e:
        print("Error in get_stock_receipts:", e)
        import traceback
        traceback.print_exc()
        return []


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


@router.post(
    "/clear-catalog-and-stock",
    status_code=status.HTTP_200_OK,
)
def clear_catalog_and_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Completely deletes all products, arrival logs, receipt items, transactions, and sales.
    Allows creating products dynamically purely from imported bulk stock bills.
    """
    from app.models.sale import Sale
    db.query(Sale).delete(synchronize_session=False)
    db.query(StockTransaction).delete(synchronize_session=False)
    db.query(StockReceiptItem).delete(synchronize_session=False)
    db.query(StockReceipt).delete(synchronize_session=False)
    db.query(Product).delete(synchronize_session=False)
    db.commit()
    return {"message": "Successfully cleared all products and stock inventory. You can now import your first bulk stock bill to create products dynamically!"}


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