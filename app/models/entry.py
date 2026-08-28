from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Entry(BaseModel):
    __tablename__ = "entries"

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    scanned_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    entry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    entry_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    additional_guests: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_people: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )