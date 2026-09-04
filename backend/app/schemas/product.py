from pydantic import BaseModel, ConfigDict


class ProductCreateRequest(BaseModel):
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: float
    mrp: float | None = 0.0
    basic_rate: float | None = 0.0


class ProductUpdateRequest(BaseModel):
    brand_id: int | None = None
    name: str | None = None
    category: str | None = None
    volume_ml: int | None = None
    unit: str | None = None
    selling_price: float | None = None
    mrp: float | None = None
    basic_rate: float | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: float
    mrp: float = 0.0
    basic_rate: float = 0.0
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )