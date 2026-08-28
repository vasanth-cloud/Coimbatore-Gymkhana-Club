from datetime import datetime

from pydantic import BaseModel, Field


class EntryCreateRequest(BaseModel):
    qr_token: str = Field(
        min_length=10,
        max_length=200,
    )

    additional_guests: int = Field(
        default=0,
        ge=0,
        le=20,
    )


class EntryResponse(BaseModel):
    id: int
    customer_id: int
    scanned_by: int
    entry_time: datetime
    additional_guests: int
    total_people: int

    model_config = {
        "from_attributes": True
    }