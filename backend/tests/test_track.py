import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

TENANT_ID = str(uuid4())


@pytest.mark.asyncio
async def test_track_missing_phone_returns_422(client):
    response = await client.post("/api/track", json={"tenant_id": TENANT_ID})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_track_invalid_tenant_returns_404(client):
    with patch("app.routers.track.get_db") as mock_db:
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase
        tenant_resp = AsyncMock()
        tenant_resp.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        response = await client.post("/api/track", json={
            "phone": "+5511999999999",
            "tenant_id": str(uuid4()),
        })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_track_dedup_returns_existing(client):
    with (
        patch("app.routers.track.get_db") as mock_db,
        patch("app.services.geolocation.get_geo_for_ip", return_value={}),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase

        tenant_resp = AsyncMock()
        tenant_resp.data = {"id": TENANT_ID, "slug": "test"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        existing_resp = AsyncMock()
        existing_lead_id = str(uuid4())
        existing_resp.data = [{"id": existing_lead_id, "stage": 1}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=existing_resp)

        response = await client.post("/api/track", json={
            "phone": "+5511999999999",
            "tenant_id": TENANT_ID,
        })
    assert response.status_code == 200
    assert response.json()["status"] == "existing"
