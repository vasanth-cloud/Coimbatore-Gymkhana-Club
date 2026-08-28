from sqlalchemy import Column, Integer, ForeignKey, DateTime
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

    quantity = Column(
        Integer,
        nullable=False,
    )

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