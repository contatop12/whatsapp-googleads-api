from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from app.database import get_db
from app.models.tenant import TenantCreate, TenantUpdate
from app.middleware.cors_dynamic import invalidate_tenant_origins_cache
from app.middleware.tenant import AuthContext, get_auth_context, require_admin, ensure_tenant_access
from app.services.evolution import provision_instance
import logfire

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("")
async def list_tenants(
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    if auth.is_admin:
        resp = await db.table("tenants").select("*").order("created_at", desc=True).execute()
        return resp.data

    if not auth.tenant_id:
        raise HTTPException(status_code=403, detail="User has no tenant assigned")

    resp = await (
        db.table("tenants")
        .select("*")
        .eq("id", auth.tenant_id)
        .execute()
    )
    return resp.data


@router.get("/{tenant_id}")
async def get_tenant(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return resp.data


@router.post("")
async def create_tenant(
    body: TenantCreate,
    auth: AuthContext = Depends(require_admin),
    db=Depends(get_db),
):
    resp = await db.table("tenants").insert(body.model_dump()).execute()
    tenant = resp.data[0]
    try:
        await provision_instance(tenant)
    except Exception as e:
        logfire.error("evolution_provision_failed", tenant=tenant["slug"], error=str(e))
    return tenant


@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: UUID,
    body: TenantUpdate,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await db.table("tenants").update(update_data).eq("id", str(tenant_id)).execute()
    if "allowed_origins" in update_data:
        invalidate_tenant_origins_cache()
    return resp.data[0]
