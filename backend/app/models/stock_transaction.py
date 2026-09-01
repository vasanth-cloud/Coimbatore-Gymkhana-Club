from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class StockTransaction(BaseModel):
    __tablename__ = "stock_transactions"

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    quantity = Column(
        Integer,
        nullable=False,
    )

    transaction_type = Column(
        String(20),
        nullable=False,
    )

    transaction_date = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    product = relationship(
        "Product",
        back_populates="stock_transactions",
    )