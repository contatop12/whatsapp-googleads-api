from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from uuid import UUID

from app.database import get_db
from app.services.geolocation import get_geo_for_ip
import logfire

router = APIRouter()


class TrackRequest(BaseModel):
    phone: str
    tenant_id: UUID
    gclid: str | None = None
    page_url: str | None = None
    referrer: str | None = None


@router.post("/api/track")
async def track(request: Request, body: TrackRequest):
    db = await get_db()
    client_ip = request.headers.get("x-forwarded-for", "")
    if not client_ip and request.client:
        client_ip = request.client.host

    tenant_resp = await (
        db.table("tenants")
        .select("id,slug")
        .eq("id", str(body.tenant_id))
        .maybe_single()
        .execute()
    )
    if not tenant_resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")

    existing_resp = await (
        db.table("leads")
        .select("id,stage")
        .eq("tenant_id", str(body.tenant_id))
        .eq("phone", body.phone)
        .execute()
    )
    if existing_resp.data:
        logfire.info("track_dedup", phone=body.phone, tenant=str(body.tenant_id))
        return {"status": "existing", "lead_id": existing_resp.data[0]["id"]}

    geo = await get_geo_for_ip(client_ip)

    insert_resp = await (
        db.table("leads")
        .insert({
            "tenant_id": str(body.tenant_id),
            "phone": body.phone,
            "gclid": body.gclid,
            "ip": client_ip or None,
            **geo,
        })
        .execute()
    )
    lead = insert_resp.data[0]
    logfire.info("lead_created", lead_id=lead["id"], tenant=str(body.tenant_id))
    return {"status": "created", "lead_id": lead["id"]}
