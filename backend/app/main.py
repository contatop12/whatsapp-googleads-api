import base64
import warnings
from contextlib import asynccontextmanager

warnings.filterwarnings("ignore", category=DeprecationWarning, module="pydantic")

import httpx
import logfire
from cryptography.hazmat.primitives.asymmetric.ec import (
    EllipticCurvePublicNumbers,
    SECP256R1,
)
from fastapi import FastAPI, HTTPException

from app.config import settings
from app.middleware.cors_dynamic import DynamicCORSMiddleware
from app.middleware.tenant import set_supabase_pubkeys
from app.routers import track, webhooks, leads, tenants, whatsapp, debug
from app.sentry_app import init_sentry

init_sentry()


def _decode_jwk(key: dict):
    x = int.from_bytes(base64.urlsafe_b64decode(key["x"] + "=="), "big")
    y = int.from_bytes(base64.urlsafe_b64decode(key["y"] + "=="), "big")
    return EllipticCurvePublicNumbers(x=x, y=y, curve=SECP256R1()).public_key()


async def _load_supabase_jwks() -> None:
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        keys = resp.json()["keys"]

    pubkeys = {}
    for key in keys:
        kid = key.get("kid", f"key_{len(pubkeys)}")
        pubkeys[kid] = _decode_jwk(key)

    set_supabase_pubkeys(pubkeys)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await _load_supabase_jwks()
    except Exception as exc:
        warnings.warn(f"JWKS não carregado: {exc}", stacklevel=1)
    yield


app = FastAPI(title="WhatsApp → Google Ads Tracking", lifespan=lifespan)

app.add_middleware(DynamicCORSMiddleware)

if settings.logfire_enabled:
    try:
        logfire.configure(token=settings.logfire_token, service_name="rastreamento-backend")
        logfire.instrument_fastapi(app)
    except Exception as exc:
        warnings.warn(f"Logfire não inicializado: {exc}", stacklevel=1)

app.include_router(track.router)
app.include_router(webhooks.router)
app.include_router(leads.router)
app.include_router(tenants.router)
app.include_router(whatsapp.router)
app.include_router(whatsapp.evolution_router)
app.include_router(debug.router)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok", "configured": settings.is_configured()}


@app.get("/sentry-debug")
async def sentry_debug():
    """
    Rota de verificação do Sentry (guia oficial).
    Disponível apenas fora de production.
    """
    if settings.environment == "production":
        raise HTTPException(status_code=404, detail="Not found")
    if not settings.sentry_enabled:
        raise HTTPException(
            status_code=503,
            detail="SENTRY_DSN não configurado. Defina no .env e reinicie o servidor.",
        )
    _ = 1 / 0  # noqa: F841 — erro intencional para validar o painel Sentry
