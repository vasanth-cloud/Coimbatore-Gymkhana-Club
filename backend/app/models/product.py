from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"

    brand_id = Column(
        Integer,
        ForeignKey("brands.id"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    volume_ml = Column(
        Integer,
        nullable=False,
    )

    unit = Column(
        String(50),
        nullable=False,
        default="bottle",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    brand = relationship(
        "Brand",
        back_populates="products",
    )