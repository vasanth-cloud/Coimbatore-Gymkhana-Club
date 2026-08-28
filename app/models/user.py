import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"


class User(BaseModel):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.STAFF,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<User(id={self.id}, "
            f"email={self.email}, "
            f"role={self.role})>"
        )