from pydantic import BaseModel, ConfigDict


class ProductCreateRequest(BaseModel):
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str = "bottle"


class ProductResponse(BaseModel):
    id: int
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)