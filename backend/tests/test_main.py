import pytest


@pytest.mark.asyncio
async def test_health(public_client):
    response = await public_client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "configured" in body


@pytest.mark.asyncio
async def test_leads_requires_auth(public_client):
    response = await public_client.get("/api/leads", params={"tenant_id": "00000000-0000-0000-0000-000000000001"})
    assert response.status_code == 401
