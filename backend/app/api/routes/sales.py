from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_staff_or_admin
from app.models.user import User
from app.schemas.sale import (
    SaleCreateRequest,
    SaleResponse,
    DetailedSaleResponse,
    DailyProductSaleResponse,
)
from app.services.sale_service import SaleService


router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
)


@router.get(
    "",
    response_model=list[SaleResponse],
)
def get_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = SaleService(db)
    return service.get_all_sales()


@router.get(
    "/detailed",
    response_model=list[DetailedSaleResponse],
)
def get_detailed_sales(
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = SaleService(db)
    return service.get_detailed_sales(limit=limit)


@router.get(
    "/customer/{customer_id}",
    response_model=list[DetailedSaleResponse],
)
def get_customer_sales(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = SaleService(db)
    return service.get_customer_sales(customer_id=customer_id)


@router.post(
    "",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    request: SaleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = SaleService(db)

    try:
        return service.create_sale(
            product_id=request.product_id,
            quantity=request.quantity,
            customer_id=request.customer_id,
            sale_date=request.sale_date,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/daily",
    response_model=list[DailyProductSaleResponse],
)
def get_daily_sales(
    report_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = SaleService(db)
    return service.get_daily_sales(report_date)