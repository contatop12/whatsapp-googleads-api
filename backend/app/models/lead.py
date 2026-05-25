from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class LeadCreate(BaseModel):
    tenant_id: UUID
    phone: str
    gclid: str | None = None
    ip: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    conversion_value: float | None = None


class Lead(BaseModel):
    id: UUID
    tenant_id: UUID
    phone: str
    name: str | None = None
    email: str | None = None
    gclid: str | None = None
    ip: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    stage: int
    conversion_value: float | None = None
    first_message_at: datetime | None = None
    qualified_at: datetime | None = None
    converted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
