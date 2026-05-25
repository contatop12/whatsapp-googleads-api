import warnings

import logfire
from fastapi import FastAPI, HTTPException

from app.config import settings
from app.middleware.cors_dynamic import DynamicCORSMiddleware
from app.routers import track, webhooks, leads, tenants, whatsapp, debug
from app.sentry_app import init_sentry

init_sentry()

app = FastAPI(title="WhatsApp → Google Ads Tracking")

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
app.include_router(debug.router)


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
