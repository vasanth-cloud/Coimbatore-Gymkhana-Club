from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import (
    CustomerCreateRequest,
    CustomerResponse,
)
from app.services.customer_service import CustomerService
from app.services.qr_service import QRService


router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    request: CustomerCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = CustomerService(db)

    try:
        customer = service.create_customer(
            full_name=request.full_name,
            phone=request.phone,
        )

        return customer

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{customer_id}/qr",
)
def generate_customer_qr(
    customer_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    repository = CustomerRepository(db)

    customer = repository.get_by_id(customer_id)

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer is inactive",
        )

    qr_image = QRService.generate_customer_qr(
        customer.qr_token
    )

    return StreamingResponse(
        qr_image,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'inline; filename="{customer.customer_code}.png"'
            )
        },
    )