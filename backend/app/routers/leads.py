from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from uuid import UUID
from app.database import get_db
from app.models.lead import LeadUpdate
from app.services.pipeline import advance_stage, StageValidationError

router = APIRouter(prefix="/api/leads", tags=["leads"])


class MoveRequest(BaseModel):
    new_stage: int
    conversion_value: float | None = None
    triggered_by: str = "manual"


@router.get("")
async def list_leads(tenant_id: UUID, db=Depends(get_db)):
    resp = await (
        db.table("leads")
        .select("*")
        .eq("tenant_id", str(tenant_id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


@router.get("/{lead_id}")
async def get_lead(lead_id: UUID, db=Depends(get_db)):
    resp = await db.table("leads").select("*").eq("id", str(lead_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return resp.data


@router.patch("/{lead_id}")
async def update_lead(lead_id: UUID, body: LeadUpdate, db=Depends(get_db)):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await db.table("leads").update(update_data).eq("id", str(lead_id)).execute()
    return resp.data[0]


@router.post("/{lead_id}/move")
async def move_lead(lead_id: UUID, body: MoveRequest, db=Depends(get_db)):
    lead_resp = await db.table("leads").select("*").eq("id", str(lead_id)).maybe_single().execute()
    if not lead_resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    tenant_resp = await (
        db.table("tenants")
        .select("*")
        .eq("id", str(lead_resp.data["tenant_id"]))
        .maybe_single()
        .execute()
    )

    try:
        updated = await advance_stage(
            lead=lead_resp.data,
            new_stage=body.new_stage,
            tenant=tenant_resp.data,
            triggered_by=body.triggered_by,
            conversion_value=body.conversion_value,
        )
        return updated
    except StageValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
