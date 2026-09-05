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
from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import (
    EntryCreateRequest,
    EntryResponse,
    DetailedEntryResponse,
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
    current_user: User = Depends(require_staff_or_admin),
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


@router.get(
    "/recent",
    response_model=list[DetailedEntryResponse],
)
def get_recent_entries(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    repository = EntryRepository(db)
    return repository.get_recent_entries_detailed(limit=limit)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_200_OK,
)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    from app.models.entry import Entry
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry log not found",
        )
    db.delete(entry)
    db.commit()
    return {"message": f"Entry log #{entry_id} deleted successfully"}