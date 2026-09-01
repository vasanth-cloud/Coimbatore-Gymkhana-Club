from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.schemas.product import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
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
            selling_price=request.selling_price,
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
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
):
    service = ProductService(db)

    try:
        return service.get_products_by_brand(brand_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    request: ProductUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        return service.update_product(
            product_id=product_id,
            brand_id=request.brand_id,
            name=request.name,
            category=request.category,
            volume_ml=request.volume_ml,
            unit=request.unit,
            selling_price=request.selling_price,
            is_active=request.is_active,
        )

    except ValueError as e:
        err_msg = str(e)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in err_msg.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=err_msg,
        )


@router.put(
    "/{product_id}/price",
    response_model=ProductResponse,
)
def update_product_price(
    product_id: int,
    request: ProductUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        return service.update_selling_price(
            product_id=product_id,
            selling_price=request.selling_price if request.selling_price is not None else 0,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ProductService(db)

    try:
        service.delete_product(product_id)
        return None

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/category/{category}",
    response_model=list[ProductResponse],
)
def get_products_by_category(
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = ProductService(db)

    return service.get_products_by_category(category)