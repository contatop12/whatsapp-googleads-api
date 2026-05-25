from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import settings
from app.middleware.tenant import require_admin
from app.sentry_app import capture_test_event
from app.services.google_ads import upload_conversion

router = APIRouter(prefix="/debug", tags=["debug"])


class DebugConversionRequest(BaseModel):
    gclid: str
    stage: int = 1
    tenant_id: str
    dry_run: bool = True


@router.post("/conversion")
async def debug_conversion(
    body: DebugConversionRequest,
    _auth=Depends(require_admin),
):
    if body.dry_run:
        return {
            "dry_run": True,
            "would_send": {
                "gclid": body.gclid,
                "stage": body.stage,
                "tenant_id": body.tenant_id,
            },
        }
    lead = {
        "id": "debug",
        "gclid": body.gclid,
        "stage": body.stage,
        "first_message_at": None,
        "qualified_at": None,
        "converted_at": None,
        "conversion_value": None,
    }
    tenant = {
        "google_ads_customer_id": body.tenant_id,
        "google_ads_conversion_new_lead": "debug_lead",
        "google_ads_conversion_qualified": "debug_qualified",
        "google_ads_conversion_converted": "debug_converted",
    }
    return await upload_conversion(lead=lead, stage=body.stage, tenant=tenant)


@router.post("/sentry-test")
async def sentry_test(_auth=Depends(require_admin)):
    """Dispara um evento de teste no Sentry (requer SENTRY_DSN válido)."""
    if not settings.sentry_enabled:
        return {
            "ok": False,
            "detail": "SENTRY_DSN ausente ou inválido. Use o DSN HTTPS do projeto (Client Keys).",
        }
    event_id = capture_test_event()
    return {"ok": True, "event_id": event_id}
