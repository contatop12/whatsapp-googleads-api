from datetime import datetime, timezone
from app.database import get_db
from app.services.google_ads import upload_conversion
import logfire
import sentry_sdk


class StageValidationError(Exception):
    pass


_STAGE_TIMESTAMPS = {2: "qualified_at", 3: "converted_at"}


def _validate_advance(lead: dict, new_stage: int, conversion_value: float | None) -> None:
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

    if new_stage == 3:
        if not lead.get("name"):
            raise StageValidationError("name required to advance to stage 3")
        if not lead.get("email"):
            raise StageValidationError("email required to advance to stage 3")
        if conversion_value is None and lead.get("conversion_value") is None:
            raise StageValidationError("conversion_value required to advance to stage 3")


async def advance_stage(
    lead: dict,
    new_stage: int,
    tenant: dict,
    triggered_by: str,
    conversion_value: float | None,
) -> dict:
    _validate_advance(lead, new_stage, conversion_value)

    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    ts_field = _STAGE_TIMESTAMPS.get(new_stage)

    update_data: dict = {"stage": new_stage}
    if ts_field:
        update_data[ts_field] = now
    if conversion_value is not None:
        update_data["conversion_value"] = conversion_value

    update_resp = await (
        db.table("leads")
        .update(update_data)
        .eq("id", str(lead["id"]))
        .execute()
    )
    updated_lead = update_resp.data[0]

    upload_result = await upload_conversion(lead=updated_lead, stage=new_stage, tenant=tenant)

    conversion_name = {
        1: tenant.get("google_ads_conversion_new_lead"),
        2: tenant.get("google_ads_conversion_qualified"),
        3: tenant.get("google_ads_conversion_converted"),
    }.get(new_stage, "")

    await (
        db.table("conversions")
        .insert({
            "tenant_id": str(lead["tenant_id"]),
            "lead_id": str(lead["id"]),
            "stage": new_stage,
            "gclid": lead.get("gclid", ""),
            "conversion_name": conversion_name or "",
            "conversion_value": conversion_value or lead.get("conversion_value"),
            "google_ads_status": upload_result.get("status", "pending"),
            "google_ads_response": upload_result.get("response"),
            "triggered_by": triggered_by,
        })
        .execute()
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
