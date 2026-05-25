from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_ads import upload_conversion

router = APIRouter(prefix="/debug", tags=["debug"])


class DebugConversionRequest(BaseModel):
    gclid: str
    stage: int = 1
    tenant_id: str
    dry_run: bool = True


@router.post("/conversion")
async def debug_conversion(body: DebugConversionRequest):
    if body.dry_run:
        return {
            "dry_run": True,
            "would_send": {
                "gclid": body.gclid,
                "stage": body.stage,
                "tenant_id": body.tenant_id,
            }
        }
    lead = {
        "id": "debug", "gclid": body.gclid, "stage": body.stage,
        "first_message_at": None, "qualified_at": None, "converted_at": None, "conversion_value": None,
    }
    tenant = {
        "google_ads_customer_id": body.tenant_id,
        "google_ads_conversion_new_lead": "debug_lead",
        "google_ads_conversion_qualified": "debug_qualified",
        "google_ads_conversion_converted": "debug_converted",
    }
    return await upload_conversion(lead=lead, stage=body.stage, tenant=tenant)
