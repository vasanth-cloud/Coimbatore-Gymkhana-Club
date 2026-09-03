from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SaleCreateRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    customer_id: int | None = None
    payment_mode: str = "CASH"
    paytm_order_id: str | None = None
    cash_500: int = 0
    cash_200: int = 0
    cash_100: int = 0
    cash_50: int = 0
    cash_20: int = 0
    cash_10: int = 0
    sale_date: datetime | None = None


class SaleResponse(BaseModel):
    id: int
    product_id: int
    customer_id: int | None = None
    quantity: int
    total_price: int | None = None
    payment_mode: str = "CASH"
    paytm_order_id: str | None = None
    sale_date: datetime

    model_config = ConfigDict(from_attributes=True)


class DetailedSaleResponse(BaseModel):
    id: int
    sale_date: datetime
    quantity: int
    unit_price: int
    total_price: int
    payment_mode: str = "CASH"
    paytm_order_id: str | None = None
    cash_500: int = 0
    cash_200: int = 0
    cash_100: int = 0
    cash_50: int = 0
    cash_20: int = 0
    cash_10: int = 0

    # Customer Details
    customer_id: int | None = None
    customer_code: str | None = None
    customer_name: str | None = None
    phone: str | None = None

    # Product & Brand Details
    product_id: int
    product_name: str
    brand_name: str | None = None
    category: str
    volume_ml: int

    model_config = ConfigDict(from_attributes=True)


class DailyProductSaleResponse(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int