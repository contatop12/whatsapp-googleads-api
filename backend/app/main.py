import sentry_sdk
import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.config import settings

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.2,
        environment=settings.environment,
        send_default_pii=False,
    )

if settings.logfire_token:
    logfire.configure(token=settings.logfire_token, service_name="rastreamento-backend")

app = FastAPI(title="WhatsApp → Google Ads Tracking")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.logfire_token:
    logfire.instrument_fastapi(app)


@app.get("/health")
async def health():
    return {"status": "ok"}
