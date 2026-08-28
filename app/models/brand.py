from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Brand(BaseModel):
    __tablename__ = "brands"

    name = Column(
        String(150),
        nullable=False,
        unique=True,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    products = relationship(
        "Product",
        back_populates="brand",
        cascade="all, delete-orphan",
    )