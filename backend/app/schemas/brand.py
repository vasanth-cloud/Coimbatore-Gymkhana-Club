from pydantic import BaseModel, ConfigDict


class BrandCreateRequest(BaseModel):
    name: str
    category: str


class BrandResponse(BaseModel):
    id: int
    name: str
    category: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)