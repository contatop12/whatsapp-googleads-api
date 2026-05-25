from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TenantBase(BaseModel):
    name: str
    slug: str
    google_ads_customer_id: str | None = None
    google_ads_conversion_new_lead: str | None = None
    google_ads_conversion_qualified: str | None = None
    google_ads_conversion_converted: str | None = None
    conversion_value_qualified: float | None = None
    conversion_value_converted: float | None = None
    evolution_api_instance: str | None = None
    evolution_api_key: str | None = None
    keywords_qualified: list[str] = []
    keywords_converted: list[str] = []


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = None
    google_ads_customer_id: str | None = None
    google_ads_conversion_new_lead: str | None = None
    google_ads_conversion_qualified: str | None = None
    google_ads_conversion_converted: str | None = None
    conversion_value_qualified: float | None = None
    conversion_value_converted: float | None = None
    keywords_qualified: list[str] | None = None
    keywords_converted: list[str] | None = None


class Tenant(TenantBase):
    id: UUID
    evolution_instance_status: str
    evolution_qr_code: str | None = None
    evolution_qr_expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
