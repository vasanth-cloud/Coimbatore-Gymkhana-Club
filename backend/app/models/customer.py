from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Customer(BaseModel):
    __tablename__ = "customers"

    customer_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        index=True,
        nullable=False,
    )

    address: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    qr_token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    father_guardian_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    institution_organization: Mapped[str | None] = mapped_column(String(150), nullable=True)
    aadhaar_card_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    purpose_of_membership: Mapped[str | None] = mapped_column(String(150), nullable=True)
    declaration_accepted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    deactivated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )