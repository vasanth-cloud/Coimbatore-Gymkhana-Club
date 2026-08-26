from pydantic import BaseModel, EmailStr


class StaffCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password: str


class StaffResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    role: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }
    