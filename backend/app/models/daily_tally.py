from sqlalchemy import Column, Integer, Float, Date, String
from app.models.base import BaseModel


class DailyTally(BaseModel):
    __tablename__ = "daily_tallies"

    tally_date = Column(Date, nullable=False, unique=True, index=True)
    cash_500 = Column(Integer, default=0, nullable=False)
    cash_200 = Column(Integer, default=0, nullable=False)
    cash_100 = Column(Integer, default=0, nullable=False)
    cash_50 = Column(Integer, default=0, nullable=False)
    cash_20 = Column(Integer, default=0, nullable=False)
    cash_10 = Column(Integer, default=0, nullable=False)
    total_cash = Column(Integer, default=0, nullable=False)
    upi_paytm_total = Column(Integer, default=0, nullable=False)
    card_total = Column(Float, default=0.0, nullable=True)
    expense_amount = Column(Float, default=0.0, nullable=True)
    expense_reason = Column(String(255), nullable=True)
    grand_total = Column(Integer, default=0, nullable=False)
    notes = Column(String(255), nullable=True)
