from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SaleCreateRequest(BaseModel):

    product_id: int

    quantity: int = Field(
        gt=0
    )

    sale_date: datetime | None = None


class SaleResponse(BaseModel):

    id: int

    product_id: int

    quantity: int

    sale_date: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DailyProductSaleResponse(BaseModel):

    product_id: int

    product_name: str

    quantity_sold: int