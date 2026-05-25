import pytest
import respx
import httpx
from datetime import datetime, timezone
from app.services.google_ads import upload_conversion


def make_tenant(customer_id="1234567890"):
    return {
        "google_ads_customer_id": customer_id,
        "google_ads_conversion_new_lead": "whatsapp_novo_lead",
        "google_ads_conversion_qualified": "whatsapp_qualificado",
        "google_ads_conversion_converted": "whatsapp_convertido",
        "conversion_value_qualified": 50.0,
        "conversion_value_converted": 500.0,
    }


def make_lead():
    return {
        "id": "lead-uuid",
        "gclid": "gclid_test_123",
        "first_message_at": datetime(2026, 5, 25, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
        "qualified_at": None,
        "converted_at": None,
        "conversion_value": None,
    }


@pytest.mark.asyncio
@respx.mock
async def test_upload_conversion_stage1_accepted():
    customer_id = "1234567890"
    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "test_token", "expires_in": 3600})
    )
    respx.post(
        f"https://googleads.googleapis.com/v17/customers/{customer_id}:uploadClickConversions"
    ).mock(
        return_value=httpx.Response(200, json={"results": [{"status": "ACCEPTED"}]})
    )
    result = await upload_conversion(lead=make_lead(), stage=1, tenant=make_tenant(customer_id))
    assert result["status"] == "accepted"


@pytest.mark.asyncio
async def test_upload_conversion_no_gclid_returns_skipped():
    lead = make_lead()
    lead["gclid"] = None
    result = await upload_conversion(lead=lead, stage=1, tenant=make_tenant())
    assert result["status"] == "skipped"
    assert result["reason"] == "no_gclid"


@pytest.mark.asyncio
async def test_upload_conversion_no_customer_id_returns_skipped():
    tenant = make_tenant()
    tenant["google_ads_customer_id"] = None
    result = await upload_conversion(lead=make_lead(), stage=1, tenant=tenant)
    assert result["status"] == "skipped"
    assert result["reason"] == "no_customer_id"


@pytest.mark.asyncio
async def test_upload_conversion_stage3_uses_tenant_value_when_lead_has_none():
    from app.services.google_ads import _conversion_value_for_stage

    tenant = make_tenant()
    lead = make_lead()
    value = _conversion_value_for_stage(3, lead, tenant)
    assert value == 500.0


@pytest.mark.asyncio
async def test_upload_conversion_no_conversion_name_returns_skipped():
    tenant = make_tenant()
    tenant["google_ads_conversion_new_lead"] = None
    result = await upload_conversion(lead=make_lead(), stage=1, tenant=tenant)
    assert result["status"] == "skipped"
    assert result["reason"] == "no_conversion_name"
