from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    transaction_date: datetime | None = None


class StockBulkReceiveItem(BaseModel):
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


class TASMACImportItem(BaseModel):
    product_id: int | None = None
    product_name: str
    pack_size: int = 24
    cases: int = 0
    loose_bottles: int = 0
    rate_per_case: float = 0.0
    added_value_percent: float = 220.0
    mrp: float | None = 0.0
    selling_price: float | None = 0.0


class TASMACImportRequest(BaseModel):
    invoice_number: str | None = None
    invoice_date: str
    depot_name: str | None = "TASMAC COIMBATORE (SOUTH)"
    supplier_name: str | None = "TASMAC LTD"
    file_name: str | None = None
    items: list[TASMACImportItem]


class StockReceiptItemResponse(BaseModel):
    id: int
    product_name: str
    pack_size: int
    cases: int
    loose_bottles: int
    total_bottles: int
    rate_per_case: float
    added_value_percent: float
    tcs_amount: float
    total_line_cost: float
    calculated_basic_cost: float
    mrp: float
    selling_price: float

    model_config = ConfigDict(from_attributes=True)


class StockReceiptResponse(BaseModel):
    id: int
    invoice_number: str | None = None
    invoice_date: str
    depot_name: str | None = None
    total_cases: int
    total_bottles: int
    total_amount: float
    supplier_name: str | None = None
    file_name: str | None = None
    received_by: str | None = None
    items: list[StockReceiptItemResponse] = []

    model_config = ConfigDict(from_attributes=True)