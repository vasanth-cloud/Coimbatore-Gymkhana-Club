from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.repositories.stock_repository import StockRepository

from app.schemas.stock import (
    StockReceiveRequest,
    StockBulkReceiveItem,
    StockTransactionResponse,
    CurrentStockResponse,
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