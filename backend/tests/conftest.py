import os

# Evita inicializar Sentry/Logfire com credenciais do .env local durante os testes
os.environ["SENTRY_DSN"] = ""
os.environ["LOGFIRE_TOKEN"] = ""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.middleware.tenant import AuthContext, get_auth_context


@pytest.fixture
def auth_context():
    return AuthContext(
        user_id="test-user-id",
        tenant_id="test-tenant-id",
        role="admin",
        is_admin=True,
    )


@pytest.fixture
async def client(auth_context):
    async def override_auth():
        return auth_context

    app.dependency_overrides[get_auth_context] = override_auth
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def public_client():
    """Cliente sem override de auth — para rotas públicas (track, webhooks, health)."""
    app.dependency_overrides.clear()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
