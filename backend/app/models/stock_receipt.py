from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class StockReceipt(BaseModel):
    __tablename__ = "stock_receipts"

    invoice_number = Column(String(100), nullable=True, index=True)
    invoice_date = Column(Date, nullable=False, index=True)
    depot_name = Column(String(255), nullable=True, default="TASMAC COIMBATORE (SOUTH)")
    total_cases = Column(Integer, nullable=False, default=0)
    total_bottles = Column(Integer, nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    imfs_subtotal = Column(Numeric(12, 2), nullable=True, default=0.0)
    beer_subtotal = Column(Numeric(12, 2), nullable=True, default=0.0)
    second_sale_tax = Column(Numeric(12, 2), nullable=True, default=0.0)
    grand_total = Column(Numeric(12, 2), nullable=True, default=0.0)
    tcs_tax = Column(Numeric(12, 2), nullable=True, default=0.0)
    net_amount = Column(Numeric(12, 2), nullable=True, default=0.0)
    supplier_name = Column(String(255), nullable=True, default="TASMAC LTD")
    file_name = Column(String(255), nullable=True)
    received_by = Column(String(255), nullable=True)

    items = relationship(
        "StockReceiptItem",
        back_populates="receipt",
        cascade="all, delete-orphan",
    )


class StockReceiptItem(BaseModel):
    __tablename__ = "stock_receipt_items"

    receipt_id = Column(
        Integer,
        ForeignKey("stock_receipts.id"),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=True,
        index=True,
    )

    product_name = Column(String(255), nullable=False)
    pack_size = Column(Integer, nullable=False, default=24)
    cases = Column(Integer, nullable=False, default=0)
    loose_bottles = Column(Integer, nullable=False, default=0)
    total_bottles = Column(Integer, nullable=False, default=0)
    rate_per_case = Column(Numeric(12, 2), nullable=False, default=0.0)
    added_value_percent = Column(Numeric(12, 2), nullable=False, default=220.0)
    tcs_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    total_line_cost = Column(Numeric(12, 2), nullable=False, default=0.0)
    calculated_basic_cost = Column(Numeric(12, 2), nullable=False, default=0.0)
    mrp = Column(Numeric(12, 2), nullable=False, default=0.0)
    selling_price = Column(Numeric(12, 2), nullable=False, default=0.0)

    receipt = relationship("StockReceipt", back_populates="items")
    product = relationship("Product")
