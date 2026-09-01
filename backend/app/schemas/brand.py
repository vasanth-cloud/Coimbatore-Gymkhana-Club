from pydantic import BaseModel, ConfigDict


class BrandCreateRequest(BaseModel):
    name: str
    category: str


class BrandUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    is_active: bool | None = None


class BrandResponse(BaseModel):
    id: int
    name: str
    category: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)