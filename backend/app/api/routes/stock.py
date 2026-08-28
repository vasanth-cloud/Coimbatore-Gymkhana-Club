from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User

from app.schemas.stock import (
    StockReceiveRequest,
    StockTransactionResponse,
    CurrentStockResponse,
)

from app.services.stock_service import StockService


router = APIRouter(
    prefix="/stock",
    tags=["Stock Management"],
)


# =========================================================
# RECEIVE STOCK
# =========================================================

@router.post(
    "/receive",
    response_model=StockTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_stock(
    request: StockReceiveRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
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


# =========================================================
# GET STOCK TRANSACTIONS
# =========================================================

@router.get(
    "/transactions",
    response_model=list[StockTransactionResponse],
)
def get_stock_transactions(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):

    service = StockService(db)

    return service.get_transactions()


# =========================================================
# GET CURRENT STOCK FOR ONE PRODUCT
# =========================================================

@router.get(
    "/current/{product_id}",
    response_model=CurrentStockResponse,
)
def get_current_stock(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):

    service = StockService(db)

    try:

        return service.get_current_stock(
            product_id
        )

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# =========================================================
# GET CURRENT STOCK FOR ALL PRODUCTS
# =========================================================

@router.get(
    "/current",
    response_model=list[CurrentStockResponse],
)
def get_all_current_stock(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):

    service = StockService(db)

    return service.get_all_current_stock()