from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    transaction_date: datetime | None = None


class StockTransactionResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    transaction_type: str
    transaction_date: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class CurrentStockResponse(BaseModel):
    product_id: int
    product_name: str
    current_stock: int