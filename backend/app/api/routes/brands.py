from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.brand import (
    BrandCreateRequest,
    BrandResponse,
)
from app.services.brand_service import BrandService


router = APIRouter(
    prefix="/brands",
    tags=["Brands"],
)


@router.post(
    "",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_brand(
    request: BrandCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = BrandService(db)

    try:
        return service.create_brand(
            name=request.name,
            category=request.category,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[BrandResponse],
)
def get_brands(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = BrandService(db)

    return service.get_all_brands()


@router.get(
    "/{brand_id}",
    response_model=BrandResponse,
)
def get_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = BrandService(db)

    try:
        return service.get_brand(brand_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )