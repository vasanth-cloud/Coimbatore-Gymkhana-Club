from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.product import (
    ProductCreateRequest,
    ProductResponse,
)
from app.services.product_service import ProductService


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    request: ProductCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        return service.create_product(
            brand_id=request.brand_id,
            name=request.name,
            category=request.category,
            volume_ml=request.volume_ml,
            unit=request.unit,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    return service.get_all_products()


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        return service.get_product(product_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/brand/{brand_id}",
    response_model=list[ProductResponse],
)
def get_products_by_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        return service.get_products_by_brand(
            brand_id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )