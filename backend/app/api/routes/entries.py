from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_staff_or_admin
from app.models.user import User
from app.schemas.entry import (
    EntryCreateRequest,
    EntryResponse,
)
from app.services.entry_service import EntryService


router = APIRouter(
    prefix="/entries",
    tags=["Entries"],
)


@router.post(
    "/scan",
    response_model=EntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def scan_customer_qr(
    request: EntryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_staff_or_admin
    ),
):
    service = EntryService(db)

    try:
        entry = service.record_entry(
            qr_token=request.qr_token,
            additional_guests=request.additional_guests,
            scanned_by=current_user.id,
        )

        return entry

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )