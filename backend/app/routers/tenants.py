from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from app.database import get_db
from app.models.tenant import TenantCreate, TenantUpdate
from app.services.evolution import provision_instance
import logfire

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("")
async def list_tenants(db=Depends(get_db)):
    resp = await db.table("tenants").select("*").order("created_at", desc=True).execute()
    return resp.data


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: UUID, db=Depends(get_db)):
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return resp.data


@router.post("")
async def create_tenant(body: TenantCreate, db=Depends(get_db)):
    resp = await db.table("tenants").insert(body.model_dump()).execute()
    tenant = resp.data[0]
    try:
        await provision_instance(tenant)
    except Exception as e:
        logfire.error("evolution_provision_failed", tenant=tenant["slug"], error=str(e))
    return tenant


@router.patch("/{tenant_id}")
async def update_tenant(tenant_id: UUID, body: TenantUpdate, db=Depends(get_db)):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await db.table("tenants").update(update_data).eq("id", str(tenant_id)).execute()
    return resp.data[0]
