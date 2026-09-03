from pydantic import BaseModel, Field


class CustomerCreateRequest(BaseModel):
    customer_code: str | None = None
    full_name: str = Field(
        min_length=2,
        max_length=100,
    )
    phone: str = Field(
        min_length=10,
        max_length=20,
    )
    address: str | None = None


class CustomerUpdateRequest(BaseModel):
    customer_code: str | None = None
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None


class CustomerBulkItem(BaseModel):
    customer_code: str | None = None
    full_name: str
    phone: str
    address: str | None = None


class CustomerResponse(BaseModel):
    id: int
    customer_code: str
    full_name: str
    phone: str
    address: str | None = None
    qr_token: str | None = None
    is_active: bool

    model_config = {
        "from_attributes": True
    }