from pydantic import BaseModel, EmailStr
from typing import Optional


class StaffCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str


class StaffUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }