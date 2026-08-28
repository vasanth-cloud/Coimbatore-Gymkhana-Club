from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User

from app.schemas.report import (
    DailyEntryReport,
    DailySummaryResponse,
)

from app.services.report_service import ReportService


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.get(
    "/daily-entry",
    response_model=DailyEntryReport,
)
def get_daily_entry_report(
    report_date: date | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):

    if report_date is None:
        report_date = date.today()

    service = ReportService(db)

    return service.get_daily_entry_report(report_date)

@router.get(
    "/daily-summary",
    response_model=DailySummaryResponse,
)
def get_daily_summary(
    report_date: date,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ReportService(db)

    return service.get_daily_summary(
        report_date
    )