from pydantic import BaseModel, Field


class CustomerCreateRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=100,
    )

    phone: str = Field(
        min_length=10,
        max_length=20,
    )


class CustomerResponse(BaseModel):
    id: int
    customer_code: str
    full_name: str
    phone: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }