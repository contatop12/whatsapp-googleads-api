import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from tests.helpers import patch_get_db

TENANT_ID = str(uuid4())


@pytest.mark.asyncio
async def test_track_missing_phone_returns_422(public_client):
    response = await public_client.post("/api/track", json={"tenant_id": TENANT_ID})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_track_invalid_tenant_returns_404(public_client):
    mock_supabase = MagicMock()
    tenant_resp = MagicMock()
    tenant_resp.data = None
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(
        return_value=tenant_resp
    )
    with patch("app.routers.track.get_db", patch_get_db(mock_supabase)):

        response = await public_client.post("/api/track", json={
            "phone": "+5511999999999",
            "tenant_id": str(uuid4()),
        })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_track_dedup_returns_existing(public_client):
    mock_supabase = MagicMock()
    tenant_resp = MagicMock()
    tenant_resp.data = {"id": TENANT_ID, "slug": "test"}
    existing_resp = MagicMock()
    existing_lead_id = str(uuid4())
    existing_resp.data = [{"id": existing_lead_id, "stage": 1}]

    tenant_table = MagicMock()
    tenant_table.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(
        return_value=tenant_resp
    )
    leads_table = MagicMock()
    leads_table.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(
        return_value=existing_resp
    )
    mock_supabase.table.side_effect = lambda name: tenant_table if name == "tenants" else leads_table

    with (
        patch("app.routers.track.get_db", patch_get_db(mock_supabase)),
        patch("app.services.geolocation.get_geo_for_ip", return_value={}),
    ):

        response = await public_client.post("/api/track", json={
            "phone": "+5511999999999",
            "tenant_id": TENANT_ID,
        })
    assert response.status_code == 200
    assert response.json()["status"] == "existing"
