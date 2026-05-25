import pytest
import respx
import httpx
from app.services.geolocation import get_geo_for_ip


@pytest.mark.asyncio
@respx.mock
async def test_get_geo_for_ip_success():
    respx.get("http://ip-api.com/json/187.17.0.1").mock(
        return_value=httpx.Response(200, json={
            "status": "success",
            "city": "São Paulo",
            "regionName": "São Paulo",
            "country": "Brazil",
            "lat": -23.5505,
            "lon": -46.6333,
        })
    )
    geo = await get_geo_for_ip("187.17.0.1")
    assert geo["city"] == "São Paulo"
    assert geo["country"] == "Brazil"
    assert geo["latitude"] == -23.5505


@pytest.mark.asyncio
@respx.mock
async def test_get_geo_for_ip_fail_returns_empty():
    respx.get("http://ip-api.com/json/127.0.0.1").mock(
        return_value=httpx.Response(200, json={"status": "fail"})
    )
    geo = await get_geo_for_ip("127.0.0.1")
    assert geo == {}


@pytest.mark.asyncio
async def test_localhost_returns_empty():
    geo = await get_geo_for_ip("127.0.0.1")
    assert geo == {}
