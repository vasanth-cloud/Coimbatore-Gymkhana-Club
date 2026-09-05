from pydantic import BaseModel, Field


class CustomerCreateRequest(BaseModel):
    customer_code: str | None = None
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=20)
    address: str | None = None
    father_guardian_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    occupation: str | None = None
    institution_organization: str | None = None
    aadhaar_card_no: str | None = None
    email: str | None = None
    blood_group: str | None = None
    emergency_contact_no: str | None = None
    purpose_of_membership: str | None = None
    declaration_accepted: bool | None = True
    photo_url: str | None = None


class CustomerUpdateRequest(BaseModel):
    customer_code: str | None = None
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    father_guardian_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    occupation: str | None = None
    institution_organization: str | None = None
    aadhaar_card_no: str | None = None
    email: str | None = None
    blood_group: str | None = None
    emergency_contact_no: str | None = None
    purpose_of_membership: str | None = None
    declaration_accepted: bool | None = None
    photo_url: str | None = None


class CustomerBulkItem(BaseModel):
    customer_code: str | None = None
    full_name: str
    phone: str
    address: str | None = None
    father_guardian_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    occupation: str | None = None
    institution_organization: str | None = None
    aadhaar_card_no: str | None = None
    email: str | None = None
    blood_group: str | None = None
    emergency_contact_no: str | None = None
    purpose_of_membership: str | None = None
    declaration_accepted: bool | None = True
    photo_url: str | None = None


class CustomerResponse(BaseModel):
    id: int
    customer_code: str
    full_name: str
    phone: str
    address: str | None = None
    father_guardian_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    occupation: str | None = None
    institution_organization: str | None = None
    aadhaar_card_no: str | None = None
    email: str | None = None
    blood_group: str | None = None
    emergency_contact_no: str | None = None
    purpose_of_membership: str | None = None
    declaration_accepted: bool | None = True
    qr_token: str | None = None
    photo_url: str | None = None
    is_active: bool

    model_config = {
        "from_attributes": True
    }