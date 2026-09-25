from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    transaction_date: datetime | None = None


class StockAdjustmentRequest(BaseModel):
    product_id: int
    target_bottles: int = Field(ge=0)


class DailyLedgerEntryRequest(BaseModel):
    product_id: int | None = 0
    product_name: str | None = None
    category: str | None = "SPIRITS"
    volume_ml: int | None = 750
    pack_size: int | None = 12
    mrp: float | None = 0.0
    basic_rate: float | None = 0.0
    selling_price: float | None = 0.0
    target_date: str | None = None  # YYYY-MM-DD
    opening_bottles: int | None = None
    purchase_bottles: int | None = 0
    sale_bottles: int | None = 0
    closing_bottles: int | None = None



class BulkDailyLedgerEntryRequest(BaseModel):
    target_date: str  # YYYY-MM-DD
    items: list[DailyLedgerEntryRequest]


class DailyLockStatusResponse(BaseModel):
    lock_date: str
    is_locked: bool


class ToggleDailyLockRequest(BaseModel):
    lock_date: str
    is_locked: bool



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
    volume_ml: int | None = None
    pack_size: int = 24
    cases: int = 0
    loose_bottles: int = 0
    rate_per_case: float = 0.0
    added_value_rs: float | None = 0.0
    added_value_percent: float = 220.0
    mrp: float | None = 0.0
    selling_price: float | None = 0.0


class TASMACImportRequest(BaseModel):
    invoice_number: str | None = None
    invoice_date: str
    depot_name: str | None = "TASMAC COIMBATORE (SOUTH)"
    supplier_name: str | None = "TASMAC LTD"
    file_name: str | None = None
    total_cases: int | None = 0
    total_basic_amount: float | None = 0.0
    imfs_subtotal: float | None = 0.0
    beer_subtotal: float | None = 0.0
    second_sale_tax: float | None = 0.0
    grand_total: float | None = 0.0
    tcs_tax: float | None = 0.0
    net_amount: float | None = 0.0
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
    imfs_subtotal: float | None = 0.0
    beer_subtotal: float | None = 0.0
    second_sale_tax: float | None = 0.0
    grand_total: float | None = 0.0
    tcs_tax: float | None = 0.0
    net_amount: float | None = 0.0
    supplier_name: str | None = None
    file_name: str | None = None
    received_by: str | None = None
    items: list[StockReceiptItemResponse] = []

    model_config = ConfigDict(from_attributes=True)