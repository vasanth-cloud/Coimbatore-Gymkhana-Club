from pydantic import BaseModel, ConfigDict


class ProductCreateRequest(BaseModel):
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: int


class ProductUpdateRequest(BaseModel):
    brand_id: int | None = None
    name: str | None = None
    category: str | None = None
    volume_ml: int | None = None
    unit: str | None = None
    selling_price: int | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: int
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )