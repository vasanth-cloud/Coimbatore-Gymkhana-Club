from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class Sale(BaseModel):
    __tablename__ = "sales"

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=True,
        index=True,
    )

    quantity = Column(
        Integer,
        nullable=False,
    )

    total_price = Column(
        Integer,
        nullable=True,
    )

    payment_mode = Column(
        String(50),
        default="CASH",
        nullable=False,
    )

    paytm_order_id = Column(
        String(100),
        nullable=True,
    )

    # Cash Denomination Breakdown
    cash_500 = Column(Integer, default=0, nullable=False)
    cash_200 = Column(Integer, default=0, nullable=False)
    cash_100 = Column(Integer, default=0, nullable=False)
    cash_50 = Column(Integer, default=0, nullable=False)
    cash_20 = Column(Integer, default=0, nullable=False)
    cash_10 = Column(Integer, default=0, nullable=False)

    sale_date = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    product = relationship(
        "Product",
        back_populates="sales",
    )

    customer = relationship(
        "Customer",
        backref="sales",
    )