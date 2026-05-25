from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class Conversion(BaseModel):
    id: UUID
    tenant_id: UUID
    lead_id: UUID
    stage: int
    gclid: str
    conversion_name: str
    conversion_value: float | None = None
    triggered_at: datetime
    google_ads_status: str
    google_ads_response: dict | None = None
    triggered_by: str

    model_config = {"from_attributes": True}
