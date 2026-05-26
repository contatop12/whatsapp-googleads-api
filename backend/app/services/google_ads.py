import httpx
import logfire
import sentry_sdk
from datetime import datetime, timezone
from app.config import settings


async def _get_access_token() -> str:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_ads_client_id,
                "client_secret": settings.google_ads_client_secret,
                "refresh_token": settings.google_ads_refresh_token,
                "grant_type": "refresh_token",
            },
        )
        r.raise_for_status()
        return r.json()["access_token"]


def _conversion_name_for_stage(stage: int, tenant: dict) -> str | None:
    return {
        1: tenant.get("google_ads_conversion_new_lead"),
        2: tenant.get("google_ads_conversion_qualified"),
        3: tenant.get("google_ads_conversion_converted"),
    }.get(stage)


def _conversion_value_for_stage(stage: int, lead: dict, tenant: dict) -> float | None:
    if stage == 1:
        return None
    if stage == 2:
        return tenant.get("conversion_value_qualified")
    if stage == 3:
        return lead.get("conversion_value") or tenant.get("conversion_value_converted")
    return None


def _conversion_time_for_stage(stage: int, lead: dict) -> datetime:
    ts = {
        1: lead.get("first_message_at") or lead.get("created_at"),
        2: lead.get("qualified_at") or lead.get("first_message_at"),
        3: lead.get("converted_at") or lead.get("qualified_at"),
    }.get(stage)
    if isinstance(ts, str):
        return datetime.fromisoformat(ts)
    return ts or datetime.now(timezone.utc)


async def upload_conversion(lead: dict, stage: int, tenant: dict) -> dict:
    if not lead.get("gclid"):
        return {"status": "skipped", "reason": "no_gclid"}

    customer_id = (tenant.get("google_ads_customer_id") or "").replace("-", "")
    if not customer_id:
        return {"status": "skipped", "reason": "no_customer_id"}

    conversion_name = _conversion_name_for_stage(stage, tenant)
    if not conversion_name:
        return {"status": "skipped", "reason": "no_conversion_name"}

    conversion_value = _conversion_value_for_stage(stage, lead, tenant)

    conv_time = _conversion_time_for_stage(stage, lead)
    conv_time_str = conv_time.strftime("%Y-%m-%d %H:%M:%S+00:00")

    payload = {
        "conversions": [{
            "gclid": lead["gclid"],
            "conversionAction": f"customers/{customer_id}/conversionActions/{conversion_name}",
            "conversionDateTime": conv_time_str,
            **({"conversionValue": conversion_value, "currencyCode": "BRL"} if conversion_value else {}),
        }],
        "partialFailure": True,
    }

    try:
        access_token = await _get_access_token()
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"https://googleads.googleapis.com/v17/customers/{customer_id}:uploadClickConversions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": settings.google_ads_developer_token,
                    "Content-Type": "application/json",
                },
            )
            try:
                response_data = r.json()
            except Exception:
                response_data = {}

        if r.status_code == 200:
            logfire.info("google_ads_conversion_sent", lead_id=str(lead.get("id")), stage=stage)
            results = response_data.get("results", [])
            if results and results[0].get("status") == "ACCEPTED":
                return {"status": "accepted", "response": response_data}
            return {"status": "rejected", "response": response_data}
        else:
            sentry_sdk.capture_message(f"Google Ads upload failed: {r.status_code}", level="error")
            return {"status": "rejected", "response": response_data}

    except Exception as e:
        logfire.error("google_ads_error", error=str(e), lead_id=str(lead.get("id")))
        sentry_sdk.capture_exception(e)
        return {"status": "error", "reason": str(e)}
