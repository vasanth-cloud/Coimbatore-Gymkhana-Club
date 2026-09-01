from datetime import date
from fastapi import APIRouter, Depends, Query
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
    return service.get_daily_summary(report_date)


@router.get(
    "/entries",
)
def get_entries_report(
    period: str = Query("daily", description="daily or monthly"),
    report_date: date | None = Query(None, description="Date for daily report"),
    year: int | None = Query(None, description="Year for monthly report"),
    month: int | None = Query(None, description="Month for monthly report"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ReportService(db)
    return service.get_entries_report(
        period=period,
        date_val=report_date,
        year=year,
        month=month,
    )


@router.get(
    "/stock",
)
def get_stock_report(
    period: str = Query("daily", description="daily or monthly"),
    report_date: date | None = Query(None, description="Date for daily report"),
    year: int | None = Query(None, description="Year for monthly report"),
    month: int | None = Query(None, description="Month for monthly report"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ReportService(db)
    return service.get_stock_report(
        period=period,
        date_val=report_date,
        year=year,
        month=month,
    )


@router.get(
    "/sales",
)
def get_sales_report(
    period: str = Query("daily", description="daily or monthly"),
    report_date: date | None = Query(None, description="Date for daily report"),
    year: int | None = Query(None, description="Year for monthly report"),
    month: int | None = Query(None, description="Month for monthly report"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    service = ReportService(db)
    return service.get_sales_report(
        period=period,
        date_val=report_date,
        year=year,
        month=month,
    )