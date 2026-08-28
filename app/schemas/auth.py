from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    role: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }