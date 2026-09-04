from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff_or_admin
from app.models.user import User
from app.models.daily_tally import DailyTally

from app.schemas.report import (
    DailyEntryReport,
    DailySummaryResponse,
)
from app.schemas.daily_tally import (
    DailyTallySaveRequest,
    DailyTallyResponse,
)
from app.services.report_service import ReportService


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.post(
    "/tally",
    response_model=DailyTallyResponse,
)
def save_daily_tally(
    request: DailyTallySaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    total_cash = (
        request.cash_500 * 500
        + request.cash_200 * 200
        + request.cash_100 * 100
        + request.cash_50 * 50
        + request.cash_20 * 20
        + request.cash_10 * 10
    )
    grand_total = total_cash + request.upi_paytm_total + int(request.card_total) + int(request.expense_amount)

    # Upsert daily tally record for the date
    existing = db.query(DailyTally).filter(DailyTally.tally_date == request.tally_date, DailyTally.is_deleted == False).first()
    if existing:
        existing.cash_500 = request.cash_500
        existing.cash_200 = request.cash_200
        existing.cash_100 = request.cash_100
        existing.cash_50 = request.cash_50
        existing.cash_20 = request.cash_20
        existing.cash_10 = request.cash_10
        existing.total_cash = total_cash
        existing.upi_paytm_total = request.upi_paytm_total
        existing.card_total = request.card_total
        existing.expense_amount = request.expense_amount
        existing.expense_reason = request.expense_reason
        existing.grand_total = grand_total
        existing.notes = request.notes
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_tally = DailyTally(
            tally_date=request.tally_date,
            cash_500=request.cash_500,
            cash_200=request.cash_200,
            cash_100=request.cash_100,
            cash_50=request.cash_50,
            cash_20=request.cash_20,
            cash_10=request.cash_10,
            total_cash=total_cash,
            upi_paytm_total=request.upi_paytm_total,
            card_total=request.card_total,
            expense_amount=request.expense_amount,
            expense_reason=request.expense_reason,
            grand_total=grand_total,
            notes=request.notes,
        )
        db.add(new_tally)
        db.commit()
        db.refresh(new_tally)
        return new_tally


@router.get(
    "/tally",
    response_model=list[DailyTallyResponse],
)
def get_daily_tallies(
    period: str = Query("daily", description="daily or monthly"),
    report_date: date | None = Query(None),
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    query = db.query(DailyTally).filter(DailyTally.is_deleted == False)

    if period == "daily" and report_date:
        query = query.filter(DailyTally.tally_date == report_date)
    elif period == "monthly" and year and month:
        from sqlalchemy import extract
        query = query.filter(
            extract("year", DailyTally.tally_date) == year,
            extract("month", DailyTally.tally_date) == month,
        )

    return query.order_by(DailyTally.tally_date.desc()).all()


@router.get(
    "/daily-entry",
    response_model=DailyEntryReport,
)
def get_daily_entry_report(
    report_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
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
    current_user: User = Depends(require_staff_or_admin),
):
    service = ReportService(db)
    return service.get_sales_report(
        period=period,
        date_val=report_date,
        year=year,
        month=month,
    )