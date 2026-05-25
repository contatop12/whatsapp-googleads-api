import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

TENANT_ID = str(uuid4())


def make_message_payload(phone: str, message: str):
    return {
        "event": "MESSAGES_UPSERT",
        "data": {
            "key": {"remoteJid": f"{phone}@s.whatsapp.net"},
            "message": {"conversation": message},
            "messageTimestamp": 1716652800,
        }
    }


def mock_supabase_with_tenant(tenant_id=TENANT_ID):
    mock_supabase = AsyncMock()
    tenant_resp = AsyncMock()
    tenant_resp.data = {
        "id": tenant_id, "slug": "test-tenant",
        "keywords_qualified": [], "keywords_converted": [],
        "google_ads_conversion_new_lead": "lead",
        "google_ads_customer_id": None,
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)
    return mock_supabase


@pytest.mark.asyncio
async def test_webhook_unknown_tenant_returns_404(client):
    with patch("app.routers.webhooks.get_db") as mock_db:
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase
        tenant_resp = AsyncMock()
        tenant_resp.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        response = await client.post("/webhooks/evolution/nonexistent", json={"event": "MESSAGES_UPSERT"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_webhook_connection_update_open(client):
    with (
        patch("app.routers.webhooks.get_db") as mock_db,
        patch("app.routers.webhooks.handle_connection_update", new_callable=AsyncMock),
    ):
        mock_db.return_value = mock_supabase_with_tenant()
        payload = {"event": "CONNECTION_UPDATE", "data": {"state": "open"}}
        response = await client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_webhook_group_message_ignored(client):
    with patch("app.routers.webhooks.get_db") as mock_db:
        mock_supabase = mock_supabase_with_tenant()
        mock_db.return_value = mock_supabase

        payload = {
            "event": "MESSAGES_UPSERT",
            "data": {
                "key": {"remoteJid": "120363000000@g.us"},
                "message": {"conversation": "group msg"},
                "messageTimestamp": 1716652800,
            }
        }
        response = await client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_webhook_new_lead_creates_stage1(client):
    with (
        patch("app.routers.webhooks.get_db") as mock_db,
        patch("app.routers.webhooks.upload_conversion", return_value={"status": "skipped", "reason": "no_gclid"}),
    ):
        mock_supabase = mock_supabase_with_tenant()
        mock_db.return_value = mock_supabase

        # No existing lead
        lead_resp = AsyncMock()
        lead_resp.data = []
        # New lead insert
        new_lead = {"id": str(uuid4()), "stage": 1, "tenant_id": TENANT_ID, "phone": "5511999999999", "gclid": None}
        insert_resp = AsyncMock()
        insert_resp.data = [new_lead]
        conv_insert = AsyncMock()
        conv_insert.data = [{"id": str(uuid4())}]

        # Set up chained mocks for lead lookup and inserts
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=lead_resp)
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(return_value=insert_resp)

        payload = make_message_payload("5511999999999", "Olá!")
        response = await client.post("/webhooks/evolution/test-tenant", json=payload)
    assert response.status_code == 200
