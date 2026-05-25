from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from app.database import get_db
from app.middleware.tenant import AuthContext, get_auth_context, ensure_tenant_access
from app.services.evolution import get_or_refresh_qr

router = APIRouter(prefix="/api/tenants", tags=["whatsapp"])


@router.get("/{tenant_id}/whatsapp/qr")
async def get_whatsapp_qr(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = resp.data
    if tenant.get("evolution_instance_status") == "connected":
        return {"status": "connected", "base64": None}

    qr = await get_or_refresh_qr(tenant)
    return qr


@router.get("/{tenant_id}/whatsapp/status")
async def get_whatsapp_status(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await (
        db.table("tenants")
        .select("evolution_instance_status,evolution_api_instance")
        .eq("id", str(tenant_id))
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return resp.data
