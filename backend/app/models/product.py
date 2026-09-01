from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
)
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
        String(255),
        nullable=False,
    )

    category = Column(
        String(100),
        nullable=False,
        index=True,
    )

    volume_ml = Column(
        Integer,
        nullable=False,
    )

    unit = Column(
        String(50),
        nullable=False,
    )

    selling_price = Column(
        Integer,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships

    brand = relationship(
        "Brand",
        back_populates="products",
    )

    sales = relationship(
        "Sale",
        back_populates="product",
    )

    stock_transactions = relationship(
        "StockTransaction",
        back_populates="product",
    )