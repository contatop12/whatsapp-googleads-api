import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import settings


def init_sentry() -> bool:
    """Inicializa o Sentry quando SENTRY_DSN é um DSN HTTP(S) válido."""
    if not settings.sentry_enabled:
        return False

    traces_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2"))

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=os.getenv("SENTRY_RELEASE", "rastreamento-backend@0.1.0"),
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=traces_rate,
        enable_logs=True,
        send_default_pii=True,
        attach_stacktrace=True,
    )
    return True


def capture_test_event() -> str | None:
    """Envia evento + log de teste; retorna event_id ou None se Sentry desligado."""
    if not settings.sentry_enabled:
        return None
    sentry_sdk.logger.info("Sentry Logs test — whatsapp-googleads-api backend")
    return sentry_sdk.capture_message(
        "Sentry test event — whatsapp-googleads-api backend",
        level="info",
    )
