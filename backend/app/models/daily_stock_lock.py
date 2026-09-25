from datetime import datetime, date
from sqlalchemy import Column, Integer, Date, Boolean, DateTime, String
from app.models.base import BaseModel


class DailyStockLock(BaseModel):
    __tablename__ = "daily_stock_locks"

    lock_date = Column(Date, nullable=False, unique=True, index=True)
    is_locked = Column(Boolean, default=True, nullable=False)
    locked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    locked_by = Column(String(100), nullable=True)
