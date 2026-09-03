from sqlalchemy import Column, Integer, Date, String
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
    grand_total = Column(Integer, default=0, nullable=False)
    notes = Column(String(255), nullable=True)
