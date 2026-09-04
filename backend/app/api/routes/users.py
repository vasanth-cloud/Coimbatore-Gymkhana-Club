from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User, UserRole
from app.schemas.user import (
    StaffCreateRequest,
    StaffUpdateRequest,
    StaffResponse,
)
from app.services.user_service import UserService


router = APIRouter(
    prefix="/users",
    tags=["User Management"],
)


@router.post(
    "/staff",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_staff(
    request: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = UserService(db)

    try:
        staff = service.create_staff(
            full_name=request.full_name,
            email=request.email,
            phone=request.phone,
            password=request.password,
        )

        return staff

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/staff",
    response_model=list[StaffResponse],
)
def get_staff(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    repository = UserRepository(db)
    staff = repository.get_all_staff()
    return staff


@router.put(
    "/staff/{user_id}",
    response_model=StaffResponse,
)
def update_staff(
    user_id: int,
    request: StaffUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = UserService(db)
    try:
        updated = service.update_staff(
            user_id=user_id,
            full_name=request.full_name,
            email=request.email,
            phone=request.phone,
            password=request.password,
            role=request.role,
            is_active=request.is_active,
        )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/staff/{user_id}",
)
def delete_staff(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = UserService(db)
    try:
        service.delete_staff(user_id)
        return {"status": "success", "message": "Staff user deleted"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )