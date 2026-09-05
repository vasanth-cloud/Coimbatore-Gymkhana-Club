from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import (
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerBulkItem,
    CustomerResponse,
)
from app.services.customer_service import CustomerService
from app.services.qr_service import QRService
from app.services.ocr_service import IDCardOCRService


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
    current_user: User = Depends(require_staff_or_admin),
):
    service = CustomerService(db)

    try:
        customer = service.create_customer(
            full_name=request.full_name,
            phone=request.phone,
            address=request.address,
            custom_code=request.customer_code,
            father_guardian_name=request.father_guardian_name,
            date_of_birth=request.date_of_birth,
            gender=request.gender,
            occupation=request.occupation,
            institution_organization=request.institution_organization,
            aadhaar_card_no=request.aadhaar_card_no,
            email=request.email,
            blood_group=request.blood_group,
            emergency_contact_no=request.emergency_contact_no,
            purpose_of_membership=request.purpose_of_membership,
            declaration_accepted=request.declaration_accepted,
            photo_url=request.photo_url,
        )
        return customer

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def update_customer(
    customer_id: int,
    request: CustomerUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = CustomerService(db)

    try:
        updated = service.update_customer(
            customer_id=customer_id,
            full_name=request.full_name,
            phone=request.phone,
            address=request.address,
            customer_code=request.customer_code,
            father_guardian_name=request.father_guardian_name,
            date_of_birth=request.date_of_birth,
            gender=request.gender,
            occupation=request.occupation,
            institution_organization=request.institution_organization,
            aadhaar_card_no=request.aadhaar_card_no,
            email=request.email,
            blood_group=request.blood_group,
            emergency_contact_no=request.emergency_contact_no,
            purpose_of_membership=request.purpose_of_membership,
            declaration_accepted=request.declaration_accepted,
            photo_url=request.photo_url,
        )
        return updated

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/bulk",
    status_code=status.HTTP_200_OK,
)
def bulk_import_customers(
    items: list[CustomerBulkItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = CustomerService(db)
    dict_items = [i.model_dump() for i in items]
    result = service.bulk_create_customers(dict_items)
    return result


@router.get(
    "/lookup",
    response_model=CustomerResponse,
)
def lookup_customer(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    repository = CustomerRepository(db)
    cust = repository.lookup_customer(query)
    if not cust:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active member card found for '{query}'",
        )
    return cust


@router.get(
    "",
    response_model=list[CustomerResponse],
)
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    repository = CustomerRepository(db)
    return repository.get_all()


@router.delete(
    "/all",
    status_code=status.HTTP_200_OK,
)
def delete_all_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = CustomerService(db)
    count = service.delete_all_customers()
    return {"message": f"Successfully deleted {count} customers"}


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    service = CustomerService(db)

    try:
        service.delete_customer(customer_id)
        return None

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/{customer_id}/qr",
)
def generate_customer_qr(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
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

    qr_image = QRService.generate_customer_qr(customer.qr_token)

    return StreamingResponse(
        qr_image,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'inline; filename="{customer.customer_code}.png"'
            )
        },
    )


@router.post(
    "/scan-id-card",
    status_code=status.HTTP_200_OK,
)
async def scan_id_card(
    file: UploadFile = File(...),
    current_user: User = Depends(require_staff_or_admin),
):
    if not file.content_type or not (
        file.content_type.startswith("image/") or file.content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (PNG, JPG, WEBP) or PDF of an Aadhaar, PAN, or License card",
        )

    try:
        contents = await file.read()
        extracted_data = IDCardOCRService.process_id_card_image(contents)
        return extracted_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from ID card: {str(e)}",
        )