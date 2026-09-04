from datetime import date
from pydantic import BaseModel


class DailyTallySaveRequest(BaseModel):
    tally_date: date
    cash_500: int = 0
    cash_200: int = 0
    cash_100: int = 0
    cash_50: int = 0
    cash_20: int = 0
    cash_10: int = 0
    upi_paytm_total: int = 0
    card_total: float = 0.0
    expense_amount: float = 0.0
    expense_reason: str | None = None
    notes: str | None = None


class DailyTallyResponse(BaseModel):
    id: int
    tally_date: date
    cash_500: int
    cash_200: int
    cash_100: int
    cash_50: int
    cash_20: int
    cash_10: int
    total_cash: int
    upi_paytm_total: int
    card_total: float | None = 0.0
    expense_amount: float | None = 0.0
    expense_reason: str | None = None
    grand_total: int
    notes: str | None = None

    model_config = {"from_attributes": True}
