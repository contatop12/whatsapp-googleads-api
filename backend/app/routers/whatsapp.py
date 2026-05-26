from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from app.database import get_db
from app.middleware.tenant import (
    AuthContext,
    get_auth_context,
    ensure_tenant_access,
    require_admin,
)
from app.models.whatsapp import WhatsAppLinkRequest
import logfire

from app.services.evolution import (
    associate_instance_to_tenant,
    configure_webhook,
    find_webhook,
    get_or_refresh_qr,
    list_evolution_instances,
)

router = APIRouter(prefix="/api/tenants", tags=["whatsapp"])
evolution_router = APIRouter(prefix="/api/evolution", tags=["evolution"])


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


@router.get("/{tenant_id}/whatsapp/webhook")
async def get_whatsapp_webhook(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return await find_webhook(resp.data)


@router.post("/{tenant_id}/whatsapp/webhook")
async def activate_whatsapp_webhook(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        return await configure_webhook(resp.data)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@evolution_router.get("/instances")
async def list_instances(_auth: AuthContext = Depends(require_admin)):
    try:
        return await list_evolution_instances()
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/{tenant_id}/whatsapp/instances")
async def list_tenant_whatsapp_instances(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    if not auth.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("id").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        return await list_evolution_instances()
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/{tenant_id}/whatsapp/link")
async def link_whatsapp_instance(
    tenant_id: UUID,
    body: WhatsAppLinkRequest,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    if not auth.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        return await associate_instance_to_tenant(resp.data, body.instance_name)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        logfire.error(
            "whatsapp_link_unexpected_error",
            tenant_id=str(tenant_id),
            instance=body.instance_name,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Erro ao associar instância: {e}") from e
