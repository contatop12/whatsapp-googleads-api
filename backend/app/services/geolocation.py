import httpx
import logfire


async def get_geo_for_ip(ip: str) -> dict:
    if not ip or ip in ("127.0.0.1", "::1"):
        return {}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"http://ip-api.com/json/{ip}")
            data = r.json()
            if data.get("status") != "success":
                return {}
            return {
                "city": data.get("city"),
                "region": data.get("regionName"),
                "country": data.get("country"),
                "latitude": data.get("lat"),
                "longitude": data.get("lon"),
            }
    except Exception as e:
        logfire.warn("geolocation_failed", ip=ip, error=str(e))
        return {}
