import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from tests.helpers import patch_get_db

TENANT_ID = str(uuid4())


def make_message_payload(phone: str, message: str):
    return {
        "event": "MESSAGES_UPSERT",
        "data": {
            "key": {"remoteJid": f"{phone}@s.whatsapp.net"},
            "message": {"conversation": message},
            "messageTimestamp": 1716652800,
        },
    }


def mock_supabase_with_tenant(tenant_id=TENANT_ID):
    mock_supabase = MagicMock()
    tenant_resp = MagicMock()
    tenant_resp.data = {
        "id": tenant_id,
        "slug": "test-tenant",
        "keywords_qualified": [],
        "keywords_converted": [],
        "google_ads_conversion_new_lead": "lead",
        "google_ads_customer_id": None,
        "conversion_value_converted": 500.0,
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(
        return_value=tenant_resp
    )
    return mock_supabase


@pytest.mark.asyncio
async def test_webhook_unknown_tenant_returns_404(public_client):
    mock_supabase = MagicMock()
    tenant_resp = MagicMock()
    tenant_resp.data = None
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(
        return_value=tenant_resp
    )
    with patch("app.routers.webhooks.get_db", patch_get_db(mock_supabase)):

        response = await public_client.post("/webhooks/evolution/nonexistent", json={"event": "MESSAGES_UPSERT"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_webhook_connection_update_open(public_client):
    with (
        patch("app.routers.webhooks.get_db", patch_get_db(mock_supabase_with_tenant())),
        patch("app.routers.webhooks.handle_connection_update", new_callable=AsyncMock),
    ):
        payload = {"event": "CONNECTION_UPDATE", "data": {"state": "open"}}
        response = await public_client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_webhook_group_message_ignored(public_client):
    with patch("app.routers.webhooks.get_db", patch_get_db(mock_supabase_with_tenant())):
        payload = {
            "event": "MESSAGES_UPSERT",
            "data": {
                "key": {"remoteJid": "120363000000@g.us"},
                "message": {"conversation": "group msg"},
                "messageTimestamp": 1716652800,
            },
        }
        response = await public_client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def _message_webhook_supabase(*, leads_data, insert_data=None):
    tenant_table = MagicMock()
    tenant_resp = MagicMock()
    tenant_resp.data = {
        "id": TENANT_ID,
        "slug": "test-tenant",
        "keywords_qualified": [],
        "keywords_converted": [],
        "google_ads_conversion_new_lead": "lead",
        "google_ads_customer_id": None,
        "conversion_value_converted": 500.0,
    }
    tenant_table.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

    leads_table = MagicMock()
    leads_table.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(
        return_value=MagicMock(data=leads_data)
    )
    if insert_data is not None:
        insert_resp = MagicMock()
        insert_resp.data = insert_data
        leads_table.insert.return_value.execute = AsyncMock(return_value=insert_resp)

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = lambda name: tenant_table if name == "tenants" else leads_table
    return mock_supabase


@pytest.mark.asyncio
async def test_webhook_new_lead_creates_stage1(public_client):
    new_lead = {
        "id": str(uuid4()),
        "stage": 1,
        "tenant_id": TENANT_ID,
        "phone": "5511999999999",
        "gclid": None,
        "first_message_at": None,
    }
    mock_supabase = _message_webhook_supabase(leads_data=[], insert_data=[new_lead])

    with (
        patch("app.routers.webhooks.get_db", patch_get_db(mock_supabase)),
        patch("app.routers.webhooks.record_first_message", new_callable=AsyncMock) as mock_record,
    ):
        mock_record.return_value = {**new_lead, "first_message_at": "2024-05-25T12:00:00+00:00"}
        payload = make_message_payload("5511999999999", "Olá!")
        response = await public_client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    mock_record.assert_called_once()


@pytest.mark.asyncio
async def test_webhook_existing_lead_from_track_calls_record_first_message(public_client):
    existing_lead = {
        "id": str(uuid4()),
        "stage": 1,
        "tenant_id": TENANT_ID,
        "phone": "5511999999999",
        "gclid": "test_gclid",
        "first_message_at": None,
    }
    mock_supabase = _message_webhook_supabase(leads_data=[existing_lead])

    with (
        patch("app.routers.webhooks.get_db", patch_get_db(mock_supabase)),
        patch("app.routers.webhooks.record_first_message", new_callable=AsyncMock) as mock_record,
    ):
        mock_record.return_value = {**existing_lead, "first_message_at": "2024-05-25T12:00:00+00:00"}
        payload = make_message_payload("5511999999999", "Primeira mensagem")
        response = await public_client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    mock_record.assert_called_once()
