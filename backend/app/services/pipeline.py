from datetime import datetime, timezone
from app.database import get_db
from app.services.google_ads import upload_conversion
import logfire
import sentry_sdk


class StageValidationError(Exception):
    pass


_STAGE_TIMESTAMPS = {2: "qualified_at", 3: "converted_at"}


def _effective_conversion_value(
    new_stage: int,
    lead: dict,
    tenant: dict,
    conversion_value: float | None,
    triggered_by: str,
) -> float | None:
    if conversion_value is not None:
        return conversion_value
    if new_stage == 3 and triggered_by == "auto":
        return tenant.get("conversion_value_converted")
    if new_stage == 3:
        return lead.get("conversion_value")
    return None


def _validate_advance(
    lead: dict,
    new_stage: int,
    conversion_value: float | None,
    tenant: dict,
    triggered_by: str,
) -> None:
    current = lead["stage"]

    if new_stage <= current:
        raise StageValidationError(f"cannot go back from stage {current} to {new_stage}")

    if new_stage == 3 and current == 1:
        raise StageValidationError("must pass through stage 2 before stage 3")

    if new_stage == 2:
        if not lead.get("name"):
            raise StageValidationError("name required to advance to stage 2")
        if not lead.get("email"):
            raise StageValidationError("email required to advance to stage 2")
        if not lead.get("phone"):
            raise StageValidationError("phone required to advance to stage 2")

    if new_stage == 3:
        if not lead.get("name"):
            raise StageValidationError("name required to advance to stage 3")
        if not lead.get("email"):
            raise StageValidationError("email required to advance to stage 3")
        effective = _effective_conversion_value(new_stage, lead, tenant, conversion_value, triggered_by)
        if effective is None:
            raise StageValidationError("conversion_value required to advance to stage 3")

    if new_stage >= 2 and not lead.get("gclid"):
        logfire.warn(
            "lead_no_gclid_advance",
            lead_id=str(lead.get("id")),
            from_stage=current,
            to_stage=new_stage,
        )


async def _has_stage_conversion(lead_id: str, stage: int) -> bool:
    db = await get_db()
    resp = await (
        db.table("conversions")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("stage", stage)
        .limit(1)
        .execute()
    )
    return bool(resp.data)


async def _insert_conversion_record(
    lead: dict,
    stage: int,
    tenant: dict,
    conversion_value: float | None,
    upload_result: dict,
    triggered_by: str,
) -> None:
    db = await get_db()
    conversion_name = {
        1: tenant.get("google_ads_conversion_new_lead"),
        2: tenant.get("google_ads_conversion_qualified"),
        3: tenant.get("google_ads_conversion_converted"),
    }.get(stage, "")

    await (
        db.table("conversions")
        .insert({
            "tenant_id": str(lead["tenant_id"]),
            "lead_id": str(lead["id"]),
            "stage": stage,
            "gclid": lead.get("gclid") or "",
            "conversion_name": conversion_name or "",
            "conversion_value": conversion_value,
            "google_ads_status": upload_result.get("status", "pending"),
            "google_ads_response": upload_result.get("response"),
            "triggered_by": triggered_by,
        })
        .execute()
    )


async def record_first_message(
    lead: dict,
    tenant: dict,
    first_message_at: str,
) -> dict:
    """Marca a primeira mensagem e dispara conversão da etapa 1 (se ainda não existir)."""
    db = await get_db()
    lead_id = str(lead["id"])

    if lead.get("first_message_at") and await _has_stage_conversion(lead_id, 1):
        return lead

    update_data: dict = {}
    if not lead.get("first_message_at"):
        update_data["first_message_at"] = first_message_at

    if update_data:
        update_resp = await db.table("leads").update(update_data).eq("id", lead_id).execute()
        lead = update_resp.data[0]

    if await _has_stage_conversion(lead_id, 1):
        return lead

    if not lead.get("gclid"):
        logfire.warn("lead_no_gclid_stage1", lead_id=lead_id, tenant_id=str(lead.get("tenant_id")))

    upload_result = await upload_conversion(lead=lead, stage=1, tenant=tenant)
    await _insert_conversion_record(
        lead=lead,
        stage=1,
        tenant=tenant,
        conversion_value=None,
        upload_result=upload_result,
        triggered_by="auto",
    )

    logfire.info("stage1_conversion_recorded", lead_id=lead_id, google_ads_status=upload_result.get("status"))
    return lead


async def advance_stage(
    lead: dict,
    new_stage: int,
    tenant: dict,
    triggered_by: str,
    conversion_value: float | None,
) -> dict:
    _validate_advance(lead, new_stage, conversion_value, tenant, triggered_by)

    effective_value = _effective_conversion_value(new_stage, lead, tenant, conversion_value, triggered_by)

    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    ts_field = _STAGE_TIMESTAMPS.get(new_stage)

    update_data: dict = {"stage": new_stage}
    if ts_field:
        update_data[ts_field] = now
    if effective_value is not None:
        update_data["conversion_value"] = effective_value

    update_resp = await (
        db.table("leads")
        .update(update_data)
        .eq("id", str(lead["id"]))
        .execute()
    )
    updated_lead = update_resp.data[0]

    upload_result = await upload_conversion(lead=updated_lead, stage=new_stage, tenant=tenant)

    await _insert_conversion_record(
        lead=updated_lead,
        stage=new_stage,
        tenant=tenant,
        conversion_value=effective_value,
        upload_result=upload_result,
        triggered_by=triggered_by,
    )

    logfire.info(
        "stage_advanced",
        lead_id=str(lead["id"]),
        from_stage=lead["stage"],
        to_stage=new_stage,
        triggered_by=triggered_by,
        google_ads_status=upload_result.get("status"),
    )

    if upload_result.get("status") == "rejected":
        sentry_sdk.capture_message(
            f"Google Ads conversion rejected: lead {lead['id']} stage {new_stage}",
            level="error",
        )

    return updated_lead
