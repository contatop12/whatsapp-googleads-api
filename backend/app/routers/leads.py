from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from uuid import UUID

from app.database import get_db
from app.models.lead import LeadUpdate
from app.middleware.tenant import AuthContext, get_auth_context, ensure_tenant_access, ensure_lead_access
from app.services.pipeline import advance_stage, StageValidationError

router = APIRouter(prefix="/api/leads", tags=["leads"])


class MoveRequest(BaseModel):
    new_stage: int
    conversion_value: float | None = None
    triggered_by: str = "manual"


@router.get("")
async def list_leads(
    tenant_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    ensure_tenant_access(auth, tenant_id)
    resp = await (
        db.table("leads")
        .select("*")
        .eq("tenant_id", str(tenant_id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


@router.get("/{lead_id}")
async def get_lead(
    lead_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
):
    return await ensure_lead_access(auth, lead_id)


@router.patch("/{lead_id}")
async def update_lead(
    lead_id: UUID,
    body: LeadUpdate,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    await ensure_lead_access(auth, lead_id)
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await db.table("leads").update(update_data).eq("id", str(lead_id)).execute()
    return resp.data[0]


@router.post("/{lead_id}/move")
async def move_lead(
    lead_id: UUID,
    body: MoveRequest,
    auth: AuthContext = Depends(get_auth_context),
    db=Depends(get_db),
):
    lead = await ensure_lead_access(auth, lead_id)

    tenant_resp = await (
        db.table("tenants")
        .select("*")
        .eq("id", str(lead["tenant_id"]))
        .maybe_single()
        .execute()
    )

    try:
        updated = await advance_stage(
            lead=lead,
            new_stage=body.new_stage,
            tenant=tenant_resp.data,
            triggered_by=body.triggered_by,
            conversion_value=body.conversion_value,
        )
        return updated
    except StageValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
