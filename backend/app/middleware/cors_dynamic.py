import time
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.config import settings
from app.database import get_db

_CACHE_TTL_SECONDS = 60
_cached_tenant_origins: set[str] = set()
_cache_loaded_at: float = 0.0


def invalidate_tenant_origins_cache() -> None:
    global _cache_loaded_at
    _cache_loaded_at = 0.0


async def _load_tenant_origins() -> set[str]:
    global _cached_tenant_origins, _cache_loaded_at
    now = time.monotonic()
    if now - _cache_loaded_at < _CACHE_TTL_SECONDS:
        return _cached_tenant_origins

    origins: set[str] = set()
    try:
        db = await get_db()
        resp = await db.table("tenants").select("allowed_origins").execute()
        for row in resp.data or []:
            for origin in row.get("allowed_origins") or []:
                if origin:
                    origins.add(origin.strip().rstrip("/"))
    except Exception:
        origins = set()

    _cached_tenant_origins = origins
    _cache_loaded_at = now
    return origins


async def is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    normalized = origin.strip().rstrip("/")
    if normalized in settings.allowed_origins_list:
        return True
    tenant_origins = await _load_tenant_origins()
    return normalized in tenant_origins


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")
        allowed = await is_origin_allowed(origin)

        if request.method == "OPTIONS" and origin:
            if not allowed:
                return Response(status_code=400, content="Disallowed CORS origin")
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Authorization, Content-Type",
                    "Access-Control-Max-Age": "600",
                },
            )

        response = await call_next(request)
        if origin and allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        return response
