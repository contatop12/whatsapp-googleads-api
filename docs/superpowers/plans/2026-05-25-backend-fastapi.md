# Backend FastAPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend that receives WhatsApp lead events, classifies them by stage, and fires Google Ads offline conversions with tenant isolation.

**Architecture:** FastAPI app with Supabase (service role) for DB access. External services (Evolution API, Google Ads API, IP geolocation) wrapped in isolated service modules. Webhook handler is the core entry point; pipeline service enforces stage progression rules and triggers conversions.

**Tech Stack:** Python 3.11, FastAPI, supabase-py, httpx, pydantic-settings, sentry-sdk, logfire, pytest, pytest-asyncio, respx

---

## File Structure

```
backend/
├── app/
│   ├── main.py              - FastAPI app, Sentry, Logfire, routers
│   ├── config.py            - Settings (pydantic-settings, from .env)
│   ├── database.py          - Supabase async client singleton
│   ├── models/
│   │   ├── lead.py          - Lead Pydantic models (Create, Update, DB)
│   │   ├── tenant.py        - Tenant Pydantic models
│   │   └── conversion.py    - Conversion Pydantic models
│   ├── routers/
│   │   ├── track.py         - POST /api/track (capture gclid+phone)
│   │   ├── webhooks.py      - POST /webhooks/evolution/{slug}
│   │   ├── leads.py         - GET/PATCH /api/leads (CRUD)
│   │   ├── tenants.py       - GET/POST/PATCH /api/tenants
│   │   ├── whatsapp.py      - GET /api/tenants/{id}/whatsapp/qr + status
│   │   └── debug.py         - POST /debug/conversion (dry-run)
│   ├── services/
│   │   ├── geolocation.py   - IP → {city, region, country, lat, lng}
│   │   ├── evolution.py     - Evolution API: provision, QR, reconnect
│   │   ├── classifier.py    - classify_message(text, tenant, lead) → stage | None
│   │   ├── pipeline.py      - advance_stage(lead, new_stage, tenant, triggered_by)
│   │   └── google_ads.py    - upload_conversion(lead, stage, tenant)
│   └── middleware/
│       └── auth.py          - Supabase JWT validation → inject user + tenant
├── tests/
│   ├── conftest.py          - test client, mock supabase, fixtures
│   ├── test_track.py
│   ├── test_webhooks.py
│   ├── test_classifier.py
│   ├── test_pipeline.py
│   └── test_google_ads.py
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

### Task 1: Project scaffold + config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic-settings==2.2.1
supabase==2.4.6
httpx==0.27.0
sentry-sdk[fastapi]==1.45.0
logfire[fastapi]==0.47.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.9

# Dev/test
pytest==8.2.0
pytest-asyncio==0.23.6
respx==0.21.1
httpx==0.27.0
```

- [ ] **Step 2: Write app/config.py**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    backend_url: str = "http://localhost:8000"
    allowed_origins: str = "http://localhost:3000"
    secret_key: str

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    google_ads_developer_token: str = ""
    google_ads_client_id: str = ""
    google_ads_client_secret: str = ""
    google_ads_refresh_token: str = ""

    evolution_api_base_url: str
    evolution_api_global_key: str

    ipapi_key: str = ""
    sentry_dsn: str = ""
    logfire_token: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
```

- [ ] **Step 3: Write .env.example**

```env
ENVIRONMENT=development
BACKEND_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:3000
SECRET_KEY=change-me-64-chars

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=

EVOLUTION_API_BASE_URL=https://your-evolution.com
EVOLUTION_API_GLOBAL_KEY=your-key

IPAPI_KEY=
SENTRY_DSN=
LOGFIRE_TOKEN=
```

- [ ] **Step 4: Install dependencies**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/.env.example
git commit -m "feat(backend): scaffold project and config"
```

---

### Task 2: Supabase client + Pydantic models

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/tenant.py`
- Create: `backend/app/models/lead.py`
- Create: `backend/app/models/conversion.py`

- [ ] **Step 1: Write database.py**

```python
from supabase import AsyncClient, acreate_client
from app.config import settings

_client: AsyncClient | None = None


async def get_db() -> AsyncClient:
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client
```

- [ ] **Step 2: Write models/tenant.py**

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TenantBase(BaseModel):
    name: str
    slug: str
    google_ads_customer_id: str | None = None
    google_ads_conversion_new_lead: str | None = None
    google_ads_conversion_qualified: str | None = None
    google_ads_conversion_converted: str | None = None
    conversion_value_qualified: float | None = None
    conversion_value_converted: float | None = None
    evolution_api_instance: str | None = None
    evolution_api_key: str | None = None
    keywords_qualified: list[str] = []
    keywords_converted: list[str] = []


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = None
    google_ads_customer_id: str | None = None
    google_ads_conversion_new_lead: str | None = None
    google_ads_conversion_qualified: str | None = None
    google_ads_conversion_converted: str | None = None
    conversion_value_qualified: float | None = None
    conversion_value_converted: float | None = None
    keywords_qualified: list[str] | None = None
    keywords_converted: list[str] | None = None


class Tenant(TenantBase):
    id: UUID
    evolution_instance_status: str
    evolution_qr_code: str | None = None
    evolution_qr_expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Write models/lead.py**

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class LeadCreate(BaseModel):
    tenant_id: UUID
    phone: str
    gclid: str | None = None
    ip: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    conversion_value: float | None = None


class Lead(BaseModel):
    id: UUID
    tenant_id: UUID
    phone: str
    name: str | None = None
    email: str | None = None
    gclid: str | None = None
    ip: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    stage: int
    conversion_value: float | None = None
    first_message_at: datetime | None = None
    qualified_at: datetime | None = None
    converted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Write models/conversion.py**

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class Conversion(BaseModel):
    id: UUID
    tenant_id: UUID
    lead_id: UUID
    stage: int
    gclid: str
    conversion_name: str
    conversion_value: float | None = None
    triggered_at: datetime
    google_ads_status: str
    google_ads_response: dict | None = None
    triggered_by: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py backend/app/models/
git commit -m "feat(backend): add supabase client and pydantic models"
```

---

### Task 3: main.py + health endpoint

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Write tests/conftest.py**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
```

- [ ] **Step 2: Write test for health endpoint**

```python
# tests/test_main.py
import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd backend
pytest tests/test_main.py -v
# Expected: FAILED (ModuleNotFoundError or 404)
```

- [ ] **Step 4: Write main.py**

```python
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
```

- [ ] **Step 5: Run test — expect PASS**

```bash
pytest tests/test_main.py -v
# Expected: PASSED
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/tests/conftest.py backend/tests/test_main.py
git commit -m "feat(backend): main app with health endpoint"
```

---

### Task 4: Geolocation service

**Files:**
- Create: `backend/app/services/geolocation.py`
- Test: `backend/tests/test_geolocation.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_geolocation.py
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_geolocation.py -v
```

- [ ] **Step 3: Write services/geolocation.py**

```python
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
```

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_geolocation.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/geolocation.py backend/tests/test_geolocation.py
git commit -m "feat(backend): geolocation service (ip-api.com)"
```

---

### Task 5: POST /api/track endpoint

**Files:**
- Create: `backend/app/routers/track.py`
- Test: `backend/tests/test_track.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Write failing tests**

```python
# tests/test_track.py
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4


TENANT_ID = str(uuid4())


@pytest.mark.asyncio
async def test_track_creates_lead(client):
    mock_tenant = {"id": TENANT_ID, "slug": "test"}
    mock_lead = None  # lead doesn't exist yet

    with (
        patch("app.routers.track.get_db") as mock_db,
        patch("app.services.geolocation.get_geo_for_ip", return_value={
            "city": "São Paulo", "country": "Brazil",
            "latitude": -23.5, "longitude": -46.6,
        }),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase

        # tenant lookup succeeds
        tenant_resp = AsyncMock()
        tenant_resp.data = [mock_tenant]
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        # lead not found (dedup check)
        lead_resp = AsyncMock()
        lead_resp.data = []
        # lead insert returns new lead
        insert_resp = AsyncMock()
        insert_resp.data = [{"id": str(uuid4()), "stage": 1, "tenant_id": TENANT_ID, "phone": "+5511999999999"}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=lead_resp)
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(return_value=insert_resp)

        response = await client.post("/api/track", json={
            "phone": "+5511999999999",
            "tenant_id": TENANT_ID,
            "gclid": "test_gclid_123",
            "page_url": "https://example.com/?gclid=test_gclid_123",
            "referrer": "",
        })

    assert response.status_code == 200
    body = response.json()
    assert body["status"] in ("created", "existing")


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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_track.py -v
```

- [ ] **Step 3: Write routers/track.py**

```python
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, timezone

from app.database import get_db
from app.services.geolocation import get_geo_for_ip
import logfire

router = APIRouter()


class TrackRequest(BaseModel):
    phone: str
    tenant_id: UUID
    gclid: str | None = None
    page_url: str | None = None
    referrer: str | None = None


@router.post("/api/track")
async def track(request: Request, body: TrackRequest):
    db = await get_db()
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "")

    # Verify tenant exists
    tenant_resp = await (
        db.table("tenants")
        .select("id,slug")
        .eq("id", str(body.tenant_id))
        .maybe_single()
        .execute()
    )
    if not tenant_resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Dedup: check if lead already exists for this tenant + phone
    existing_resp = await (
        db.table("leads")
        .select("id,stage")
        .eq("tenant_id", str(body.tenant_id))
        .eq("phone", body.phone)
        .execute()
    )
    if existing_resp.data:
        logfire.info("track_dedup", phone=body.phone, tenant=str(body.tenant_id))
        return {"status": "existing", "lead_id": existing_resp.data[0]["id"]}

    # Resolve geo
    geo = await get_geo_for_ip(client_ip)

    # Create lead
    insert_resp = await (
        db.table("leads")
        .insert({
            "tenant_id": str(body.tenant_id),
            "phone": body.phone,
            "gclid": body.gclid,
            "ip": client_ip or None,
            **geo,
        })
        .execute()
    )
    lead = insert_resp.data[0]
    logfire.info("lead_created", lead_id=lead["id"], tenant=str(body.tenant_id))
    return {"status": "created", "lead_id": lead["id"]}
```

- [ ] **Step 4: Register router in main.py**

```python
# Add to main.py imports:
from app.routers import track

# Add after middleware setup:
app.include_router(track.router)
```

- [ ] **Step 5: Run — expect PASS**

```bash
pytest tests/test_track.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/track.py backend/tests/test_track.py backend/app/main.py
git commit -m "feat(backend): POST /api/track with geo + dedup"
```

---

### Task 6: Classifier service

**Files:**
- Create: `backend/app/services/classifier.py`
- Test: `backend/tests/test_classifier.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_classifier.py
import pytest
from app.services.classifier import classify_message


def make_tenant(kw_qualified=None, kw_converted=None):
    return {
        "keywords_qualified": kw_qualified or ["interessado", "quero contratar"],
        "keywords_converted": kw_converted or ["fechado", "venda feita"],
    }


def make_lead(stage: int):
    return {"stage": stage}


def test_keyword_advances_stage_1_to_2():
    tenant = make_tenant()
    lead = make_lead(1)
    result = classify_message("Olá, estou interessado no produto!", tenant, lead)
    assert result == 2


def test_keyword_advances_stage_2_to_3():
    tenant = make_tenant()
    lead = make_lead(2)
    result = classify_message("Negócio fechado, pode prosseguir.", tenant, lead)
    assert result == 3


def test_no_keyword_returns_none():
    tenant = make_tenant()
    lead = make_lead(1)
    result = classify_message("Oi, tudo bem?", tenant, lead)
    assert result is None


def test_stage_3_lead_never_advances():
    tenant = make_tenant()
    lead = make_lead(3)
    result = classify_message("interessado fechado", tenant, lead)
    assert result is None


def test_stage_2_keyword_qualified_ignored_for_stage_2_lead():
    tenant = make_tenant()
    lead = make_lead(2)
    # "interessado" matches qualified but lead is already at stage 2
    result = classify_message("interessado", tenant, lead)
    assert result is None


def test_case_insensitive():
    tenant = make_tenant()
    lead = make_lead(1)
    result = classify_message("INTERESSADO NO PRODUTO", tenant, lead)
    assert result == 2


def test_multi_word_keyword():
    tenant = make_tenant()
    lead = make_lead(1)
    result = classify_message("sim, quero contratar agora", tenant, lead)
    assert result == 2
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_classifier.py -v
```

- [ ] **Step 3: Write services/classifier.py**

```python
def classify_message(message: str, tenant: dict, lead: dict) -> int | None:
    text = message.lower()
    stage = lead["stage"]

    if stage == 1:
        for keyword in tenant.get("keywords_qualified", []):
            if keyword.lower() in text:
                return 2

    if stage == 2:
        for keyword in tenant.get("keywords_converted", []):
            if keyword.lower() in text:
                return 3

    return None
```

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_classifier.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/classifier.py backend/tests/test_classifier.py
git commit -m "feat(backend): keyword classifier service"
```

---

### Task 7: Google Ads service

**Files:**
- Create: `backend/app/services/google_ads.py`
- Test: `backend/tests/test_google_ads.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_google_ads.py
import pytest
import respx
import httpx
from datetime import datetime, timezone
from app.services.google_ads import upload_conversion, _get_access_token


def make_tenant():
    return {
        "google_ads_customer_id": "123-456-7890",
        "google_ads_conversion_new_lead": "whatsapp_novo_lead",
        "google_ads_conversion_qualified": "whatsapp_qualificado",
        "google_ads_conversion_converted": "whatsapp_convertido",
    }


def make_lead():
    return {
        "id": "lead-uuid",
        "gclid": "gclid_test_123",
        "first_message_at": datetime(2026, 5, 25, 10, 0, 0, tzinfo=timezone.utc),
        "qualified_at": None,
        "converted_at": None,
        "conversion_value": None,
    }


@pytest.mark.asyncio
@respx.mock
async def test_upload_conversion_stage1_accepted():
    customer_id = "1234567890"

    # Mock token endpoint
    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "test_token", "expires_in": 3600})
    )
    # Mock Google Ads API
    respx.post(
        f"https://googleads.googleapis.com/v17/customers/{customer_id}:uploadClickConversions"
    ).mock(
        return_value=httpx.Response(200, json={"results": [{"status": "ACCEPTED"}]})
    )

    tenant = make_tenant()
    tenant["google_ads_customer_id"] = customer_id
    lead = make_lead()

    result = await upload_conversion(lead=lead, stage=1, tenant=tenant)
    assert result["status"] == "accepted"


@pytest.mark.asyncio
@respx.mock
async def test_upload_conversion_no_gclid_returns_skipped():
    tenant = make_tenant()
    lead = make_lead()
    lead["gclid"] = None

    result = await upload_conversion(lead=lead, stage=1, tenant=tenant)
    assert result["status"] == "skipped"
    assert result["reason"] == "no_gclid"


@pytest.mark.asyncio
@respx.mock
async def test_upload_conversion_no_customer_id_returns_skipped():
    tenant = make_tenant()
    tenant["google_ads_customer_id"] = None
    lead = make_lead()

    result = await upload_conversion(lead=lead, stage=1, tenant=tenant)
    assert result["status"] == "skipped"
    assert result["reason"] == "no_customer_id"
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_google_ads.py -v
```

- [ ] **Step 3: Write services/google_ads.py**

```python
import httpx
import logfire
import sentry_sdk
from datetime import datetime, timezone
from app.config import settings


async def _get_access_token() -> str:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_ads_client_id,
                "client_secret": settings.google_ads_client_secret,
                "refresh_token": settings.google_ads_refresh_token,
                "grant_type": "refresh_token",
            },
        )
        r.raise_for_status()
        return r.json()["access_token"]


def _conversion_name_for_stage(stage: int, tenant: dict) -> str | None:
    return {
        1: tenant.get("google_ads_conversion_new_lead"),
        2: tenant.get("google_ads_conversion_qualified"),
        3: tenant.get("google_ads_conversion_converted"),
    }.get(stage)


def _conversion_time_for_stage(stage: int, lead: dict) -> datetime:
    ts = {
        1: lead.get("first_message_at") or lead.get("created_at"),
        2: lead.get("qualified_at") or lead.get("first_message_at"),
        3: lead.get("converted_at") or lead.get("qualified_at"),
    }.get(stage)
    if isinstance(ts, str):
        return datetime.fromisoformat(ts)
    return ts or datetime.now(timezone.utc)


async def upload_conversion(lead: dict, stage: int, tenant: dict) -> dict:
    if not lead.get("gclid"):
        return {"status": "skipped", "reason": "no_gclid"}

    customer_id = tenant.get("google_ads_customer_id", "").replace("-", "")
    if not customer_id:
        return {"status": "skipped", "reason": "no_customer_id"}

    conversion_name = _conversion_name_for_stage(stage, tenant)
    if not conversion_name:
        return {"status": "skipped", "reason": "no_conversion_name"}

    conversion_value = lead.get("conversion_value") if stage == 3 else (
        tenant.get("conversion_value_qualified") if stage == 2 else None
    )

    conv_time = _conversion_time_for_stage(stage, lead)
    conv_time_str = conv_time.strftime("%Y-%m-%d %H:%M:%S+00:00")

    payload = {
        "conversions": [{
            "gclid": lead["gclid"],
            "conversionAction": f"customers/{customer_id}/conversionActions/{conversion_name}",
            "conversionDateTime": conv_time_str,
            **({"conversionValue": conversion_value, "currencyCode": "BRL"} if conversion_value else {}),
        }],
        "partialFailure": True,
    }

    try:
        access_token = await _get_access_token()
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"https://googleads.googleapis.com/v17/customers/{customer_id}:uploadClickConversions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": settings.google_ads_developer_token,
                    "Content-Type": "application/json",
                },
            )
            response_data = r.json()

        if r.status_code == 200:
            logfire.info("google_ads_conversion_sent", lead_id=str(lead.get("id")), stage=stage)
            results = response_data.get("results", [])
            if results and results[0].get("status") == "ACCEPTED":
                return {"status": "accepted", "response": response_data}
            return {"status": "rejected", "response": response_data}
        else:
            sentry_sdk.capture_message(
                f"Google Ads upload failed: {r.status_code}", level="error"
            )
            return {"status": "rejected", "response": response_data}

    except Exception as e:
        logfire.error("google_ads_error", error=str(e), lead_id=str(lead.get("id")))
        sentry_sdk.capture_exception(e)
        return {"status": "error", "reason": str(e)}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_google_ads.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/google_ads.py backend/tests/test_google_ads.py
git commit -m "feat(backend): Google Ads offline conversion upload service"
```

---

### Task 8: Pipeline service (stage progression + anti-dup)

**Files:**
- Create: `backend/app/services/pipeline.py`
- Test: `backend/tests/test_pipeline.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_pipeline.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


def make_lead(stage: int, id: str = None):
    return {
        "id": id or str(uuid4()),
        "tenant_id": str(uuid4()),
        "phone": "+5511999999999",
        "gclid": "test_gclid",
        "stage": stage,
        "name": "Test Lead",
        "email": "test@test.com",
        "conversion_value": None,
        "first_message_at": datetime.now(timezone.utc).isoformat(),
        "qualified_at": None,
        "converted_at": None,
    }


def make_tenant():
    return {
        "id": str(uuid4()),
        "google_ads_customer_id": "123",
        "google_ads_conversion_new_lead": "lead",
        "google_ads_conversion_qualified": "qualified",
        "google_ads_conversion_converted": "converted",
        "conversion_value_qualified": 50.0,
    }


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_succeeds():
    lead = make_lead(1)
    lead["name"] = "João"
    lead["email"] = "joao@gmail.com"
    tenant = make_tenant()

    with (
        patch("app.services.pipeline.get_db") as mock_db,
        patch("app.services.pipeline.upload_conversion", return_value={"status": "accepted"}),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase

        update_resp = AsyncMock()
        update_resp.data = [{**lead, "stage": 2, "qualified_at": datetime.now(timezone.utc).isoformat()}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute = AsyncMock(return_value=update_resp)

        insert_conv = AsyncMock()
        insert_conv.data = [{"id": str(uuid4())}]
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(return_value=insert_conv)

        from app.services.pipeline import advance_stage
        result = await advance_stage(lead=lead, new_stage=2, tenant=tenant, triggered_by="manual", conversion_value=None)

    assert result["stage"] == 2


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_fails_without_email():
    lead = make_lead(1)
    lead["email"] = None  # missing email
    tenant = make_tenant()

    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="email"):
        await advance_stage(lead=lead, new_stage=2, tenant=tenant, triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_3_to_2_blocked():
    lead = make_lead(3)
    tenant = make_tenant()

    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="cannot go back"):
        await advance_stage(lead=lead, new_stage=2, tenant=tenant, triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_1_to_3_blocked():
    lead = make_lead(1)
    tenant = make_tenant()

    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="must pass through stage 2"):
        await advance_stage(lead=lead, new_stage=3, tenant=tenant, triggered_by="manual", conversion_value=None)
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_pipeline.py -v
```

- [ ] **Step 3: Write services/pipeline.py**

```python
from datetime import datetime, timezone
from app.database import get_db
from app.services.google_ads import upload_conversion
import logfire
import sentry_sdk


class StageValidationError(Exception):
    pass


_STAGE_TIMESTAMPS = {2: "qualified_at", 3: "converted_at"}


def _validate_advance(lead: dict, new_stage: int, conversion_value: float | None) -> None:
    current = lead["stage"]

    if new_stage <= current:
        raise StageValidationError(f"cannot go back from stage {current} to {new_stage}")

    if new_stage == 3 and current == 1:
        raise StageValidationError("must pass through stage 2 before stage 3")

    if new_stage == 2:
        if not lead.get("name"):
            raise StageValidationError("name required to advance to stage 2")
        if not lead.get("email"):
            raise StageValidationError("email required to advance to stage 2")

    if new_stage == 3:
        if not lead.get("name"):
            raise StageValidationError("name required to advance to stage 3")
        if not lead.get("email"):
            raise StageValidationError("email required to advance to stage 3")
        if conversion_value is None and lead.get("conversion_value") is None:
            raise StageValidationError("conversion_value required to advance to stage 3")


async def advance_stage(
    lead: dict,
    new_stage: int,
    tenant: dict,
    triggered_by: str,
    conversion_value: float | None,
) -> dict:
    _validate_advance(lead, new_stage, conversion_value)

    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    ts_field = _STAGE_TIMESTAMPS.get(new_stage)

    update_data: dict = {"stage": new_stage}
    if ts_field:
        update_data[ts_field] = now
    if conversion_value is not None:
        update_data["conversion_value"] = conversion_value

    update_resp = await (
        db.table("leads")
        .update(update_data)
        .eq("id", str(lead["id"]))
        .execute()
    )
    updated_lead = update_resp.data[0]

    # Upload conversion to Google Ads
    upload_result = await upload_conversion(lead=updated_lead, stage=new_stage, tenant=tenant)

    # Record in conversions table
    conversion_name = {
        1: tenant.get("google_ads_conversion_new_lead"),
        2: tenant.get("google_ads_conversion_qualified"),
        3: tenant.get("google_ads_conversion_converted"),
    }.get(new_stage, "")

    await (
        db.table("conversions")
        .insert({
            "tenant_id": str(lead["tenant_id"]),
            "lead_id": str(lead["id"]),
            "stage": new_stage,
            "gclid": lead.get("gclid", ""),
            "conversion_name": conversion_name or "",
            "conversion_value": conversion_value or lead.get("conversion_value"),
            "google_ads_status": upload_result.get("status", "pending"),
            "google_ads_response": upload_result.get("response"),
            "triggered_by": triggered_by,
        })
        .execute()
    )

    logfire.info(
        "stage_advanced",
        lead_id=str(lead["id"]),
        from_stage=lead["stage"],
        to_stage=new_stage,
        triggered_by=triggered_by,
        google_ads_status=upload_result.get("status"),
    )

    if upload_result.get("status") == "rejected":
        sentry_sdk.capture_message(
            f"Google Ads conversion rejected: lead {lead['id']} stage {new_stage}",
            level="error",
        )

    return updated_lead
```

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_pipeline.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/pipeline.py backend/tests/test_pipeline.py
git commit -m "feat(backend): pipeline stage progression with validation and Google Ads trigger"
```

---

### Task 9: Evolution API service

**Files:**
- Create: `backend/app/services/evolution.py`

- [ ] **Step 1: Write services/evolution.py**

```python
import httpx
import logfire
import sentry_sdk
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.database import get_db


def _headers() -> dict:
    return {
        "apikey": settings.evolution_api_global_key,
        "Content-Type": "application/json",
    }


async def provision_instance(tenant: dict) -> dict:
    instance_name = f"tenant_{tenant['slug']}"
    base = settings.evolution_api_base_url

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Check if instance exists
        resp = await client.get(f"{base}/instance/fetchInstances", headers=_headers())
        instances = resp.json() if resp.status_code == 200 else []
        exists = any(
            i.get("instance", {}).get("instanceName") == instance_name
            for i in (instances if isinstance(instances, list) else [])
        )

        if not exists:
            # 2. Create instance
            await client.post(f"{base}/instance/create", headers=_headers(), json={
                "instanceName": instance_name,
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": True,
            })

        # 3. Configure webhook
        webhook_url = f"{settings.backend_url}/webhooks/evolution/{tenant['slug']}"
        await client.post(f"{base}/webhook/set/{instance_name}", headers=_headers(), json={
            "url": webhook_url,
            "webhook_by_events": True,
            "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        })

        # 4. Get QR code
        qr_resp = await client.get(f"{base}/instance/connect/{instance_name}", headers=_headers())
        qr_data = qr_resp.json() if qr_resp.status_code == 200 else {}

    db = await get_db()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
    await (
        db.table("tenants")
        .update({
            "evolution_api_instance": instance_name,
            "evolution_instance_status": "connecting",
            "evolution_qr_code": qr_data.get("base64"),
            "evolution_qr_expires_at": expires_at,
        })
        .eq("id", str(tenant["id"]))
        .execute()
    )

    logfire.info("evolution_instance_provisioned", tenant=tenant["slug"], instance=instance_name)
    return qr_data


async def get_or_refresh_qr(tenant: dict) -> dict:
    from datetime import datetime, timezone
    db = await get_db()

    expires_at = tenant.get("evolution_qr_expires_at")
    qr_code = tenant.get("evolution_qr_code")

    if qr_code and expires_at:
        exp = datetime.fromisoformat(expires_at) if isinstance(expires_at, str) else expires_at
        if exp > datetime.now(timezone.utc):
            return {"base64": qr_code, "status": tenant.get("evolution_instance_status")}

    # QR expired — get fresh one
    instance_name = tenant.get("evolution_api_instance") or f"tenant_{tenant['slug']}"
    base = settings.evolution_api_base_url

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{base}/instance/connect/{instance_name}", headers=_headers())
        qr_data = resp.json() if resp.status_code == 200 else {}

    if qr_data.get("base64"):
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
        await (
            db.table("tenants")
            .update({
                "evolution_qr_code": qr_data["base64"],
                "evolution_qr_expires_at": expires_at,
                "evolution_instance_status": "connecting",
            })
            .eq("id", str(tenant["id"]))
            .execute()
        )

    return {"base64": qr_data.get("base64"), "status": "connecting"}


async def handle_connection_update(tenant_slug: str, state: str, tenant: dict) -> None:
    db = await get_db()
    if state == "open":
        await db.table("tenants").update({
            "evolution_instance_status": "connected",
            "evolution_qr_code": None,
        }).eq("slug", tenant_slug).execute()
        logfire.info("whatsapp_connected", tenant=tenant_slug)

    elif state == "close":
        await db.table("tenants").update({
            "evolution_instance_status": "disconnected",
        }).eq("slug", tenant_slug).execute()
        logfire.warn("whatsapp_disconnected", tenant=tenant_slug)
        sentry_sdk.capture_message(f"WhatsApp desconectado: tenant {tenant_slug}", level="warning")
        # Auto-reconnect: provision triggers new QR
        await provision_instance(tenant)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/evolution.py
git commit -m "feat(backend): Evolution API service (provision, QR, reconnect)"
```

---

### Task 10: Webhook handler

**Files:**
- Create: `backend/app/routers/webhooks.py`
- Test: `backend/tests/test_webhooks.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_webhooks.py
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4


TENANT_ID = str(uuid4())


def make_message_upsert_payload(phone: str, message: str):
    return {
        "event": "MESSAGES_UPSERT",
        "data": {
            "key": {"remoteJid": f"{phone}@s.whatsapp.net"},
            "message": {"conversation": message},
            "messageTimestamp": 1716652800,
        }
    }


@pytest.mark.asyncio
async def test_webhook_message_upsert_creates_lead_if_not_exists(client):
    with (
        patch("app.routers.webhooks.get_db") as mock_db,
        patch("app.services.pipeline.advance_stage", new_callable=AsyncMock) as mock_advance,
        patch("app.services.google_ads.upload_conversion", return_value={"status": "accepted"}),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase

        # Tenant found
        tenant_resp = AsyncMock()
        tenant_resp.data = {"id": TENANT_ID, "slug": "test-tenant",
                            "keywords_qualified": [], "keywords_converted": []}
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        # Lead not found (first message)
        lead_resp = AsyncMock()
        lead_resp.data = []
        new_lead_resp = AsyncMock()
        new_lead_resp.data = [{"id": str(uuid4()), "stage": 1, "tenant_id": TENANT_ID, "phone": "5511999999999"}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=lead_resp)
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(return_value=new_lead_resp)

        payload = make_message_upsert_payload("5511999999999", "Olá, tenho interesse!")
        response = await client.post("/webhooks/evolution/test-tenant", json=payload)

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_webhook_connection_update_open(client):
    with (
        patch("app.routers.webhooks.get_db") as mock_db,
        patch("app.services.evolution.handle_connection_update", new_callable=AsyncMock),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase
        tenant_resp = AsyncMock()
        tenant_resp.data = {"id": TENANT_ID, "slug": "test-tenant"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        payload = {"event": "CONNECTION_UPDATE", "data": {"state": "open"}}
        response = await client.post("/webhooks/evolution/test-tenant", json=payload)

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_webhook_unknown_tenant_returns_404(client):
    with patch("app.routers.webhooks.get_db") as mock_db:
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase
        tenant_resp = AsyncMock()
        tenant_resp.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute = AsyncMock(return_value=tenant_resp)

        response = await client.post("/webhooks/evolution/nonexistent", json={"event": "MESSAGES_UPSERT"})

    assert response.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_webhooks.py -v
```

- [ ] **Step 3: Write routers/webhooks.py**

```python
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from app.database import get_db
from app.services.classifier import classify_message
from app.services.pipeline import advance_stage
from app.services.evolution import handle_connection_update
import logfire

router = APIRouter()


@router.post("/webhooks/evolution/{slug}")
async def evolution_webhook(slug: str, payload: dict):
    db = await get_db()

    with logfire.span("webhook.evolution", tenant_slug=slug):
        logfire.info("webhook_received", event_type=payload.get("event"), tenant=slug)

        # Load tenant
        tenant_resp = await (
            db.table("tenants")
            .select("*")
            .eq("slug", slug)
            .maybe_single()
            .execute()
        )
        if not tenant_resp.data:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant = tenant_resp.data
        event = payload.get("event")

        if event == "CONNECTION_UPDATE":
            state = payload.get("data", {}).get("state")
            if state:
                await handle_connection_update(slug, state, tenant)
            return {"ok": True}

        if event == "QRCODE_UPDATED":
            qr_base64 = payload.get("data", {}).get("qrcode", {}).get("base64")
            if qr_base64:
                from datetime import timedelta
                expires_at = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
                await db.table("tenants").update({
                    "evolution_qr_code": qr_base64,
                    "evolution_qr_expires_at": expires_at,
                }).eq("slug", slug).execute()
            return {"ok": True}

        if event == "MESSAGES_UPSERT":
            data = payload.get("data", {})
            remote_jid = data.get("key", {}).get("remoteJid", "")
            phone = remote_jid.split("@")[0]
            message_text = (
                data.get("message", {}).get("conversation")
                or data.get("message", {}).get("extendedTextMessage", {}).get("text")
                or ""
            )
            timestamp = data.get("messageTimestamp")

            # Skip group messages
            if "@g.us" in remote_jid:
                return {"ok": True}

            # Find or create lead
            lead_resp = await (
                db.table("leads")
                .select("*")
                .eq("tenant_id", str(tenant["id"]))
                .eq("phone", phone)
                .execute()
            )

            if not lead_resp.data:
                # First message → create lead at stage 1
                first_message_at = (
                    datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
                    if timestamp else datetime.now(timezone.utc).isoformat()
                )
                insert_resp = await db.table("leads").insert({
                    "tenant_id": str(tenant["id"]),
                    "phone": phone,
                    "stage": 1,
                    "first_message_at": first_message_at,
                }).execute()
                lead = insert_resp.data[0]
                logfire.info("new_lead_from_webhook", phone=phone, tenant=slug)

                # Fire stage 1 conversion (no validation required)
                from app.services.google_ads import upload_conversion
                upload_result = await upload_conversion(lead=lead, stage=1, tenant=tenant)
                await db.table("conversions").insert({
                    "tenant_id": str(tenant["id"]),
                    "lead_id": str(lead["id"]),
                    "stage": 1,
                    "gclid": lead.get("gclid", ""),
                    "conversion_name": tenant.get("google_ads_conversion_new_lead", ""),
                    "google_ads_status": upload_result.get("status", "pending"),
                    "google_ads_response": upload_result.get("response"),
                    "triggered_by": "auto",
                }).execute()

            else:
                lead = lead_resp.data[0]

                # Classify message for keyword-based stage advance
                if message_text and lead["stage"] < 3:
                    new_stage = classify_message(message_text, tenant, lead)
                    if new_stage:
                        try:
                            await advance_stage(
                                lead=lead,
                                new_stage=new_stage,
                                tenant=tenant,
                                triggered_by="auto",
                                conversion_value=None,
                            )
                        except Exception as e:
                            logfire.warn("auto_advance_failed", lead_id=str(lead["id"]), error=str(e))

        return {"ok": True}
```

- [ ] **Step 4: Register router in main.py**

Add to `main.py`:
```python
from app.routers import track, webhooks

app.include_router(track.router)
app.include_router(webhooks.router)
```

- [ ] **Step 5: Run — expect PASS**

```bash
pytest tests/test_webhooks.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/webhooks.py backend/tests/test_webhooks.py backend/app/main.py
git commit -m "feat(backend): Evolution API webhook handler"
```

---

### Task 11: Leads, Tenants, WhatsApp, and Debug routers

**Files:**
- Create: `backend/app/routers/leads.py`
- Create: `backend/app/routers/tenants.py`
- Create: `backend/app/routers/whatsapp.py`
- Create: `backend/app/routers/debug.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write routers/leads.py**

```python
from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from app.database import get_db
from app.models.lead import LeadUpdate
from app.services.pipeline import advance_stage, StageValidationError

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("")
async def list_leads(tenant_id: UUID, db=Depends(get_db)):
    resp = await (
        db.table("leads")
        .select("*")
        .eq("tenant_id", str(tenant_id))
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


@router.get("/{lead_id}")
async def get_lead(lead_id: UUID, db=Depends(get_db)):
    resp = await db.table("leads").select("*").eq("id", str(lead_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return resp.data


@router.patch("/{lead_id}")
async def update_lead(lead_id: UUID, body: LeadUpdate, db=Depends(get_db)):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await (
        db.table("leads")
        .update(update_data)
        .eq("id", str(lead_id))
        .execute()
    )
    return resp.data[0]


class MoveRequest(from pydantic import BaseModel):
    new_stage: int
    conversion_value: float | None = None
    triggered_by: str = "manual"


@router.post("/{lead_id}/move")
async def move_lead(lead_id: UUID, body: dict, db=Depends(get_db)):
    new_stage = body.get("new_stage")
    triggered_by = body.get("triggered_by", "manual")
    conversion_value = body.get("conversion_value")

    lead_resp = await db.table("leads").select("*").eq("id", str(lead_id)).maybe_single().execute()
    if not lead_resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    tenant_resp = await (
        db.table("tenants")
        .select("*")
        .eq("id", str(lead_resp.data["tenant_id"]))
        .maybe_single()
        .execute()
    )

    try:
        updated = await advance_stage(
            lead=lead_resp.data,
            new_stage=new_stage,
            tenant=tenant_resp.data,
            triggered_by=triggered_by,
            conversion_value=conversion_value,
        )
        return updated
    except StageValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

- [ ] **Step 2: Fix syntax error — MoveRequest class**

The class definition above has a typo. Replace the `MoveRequest` class with a standalone import at the top:

```python
# routers/leads.py — add at top with other imports
from pydantic import BaseModel


class MoveRequest(BaseModel):
    new_stage: int
    conversion_value: float | None = None
    triggered_by: str = "manual"
```

And update the move endpoint signature:

```python
@router.post("/{lead_id}/move")
async def move_lead(lead_id: UUID, body: MoveRequest, db=Depends(get_db)):
    lead_resp = await db.table("leads").select("*").eq("id", str(lead_id)).maybe_single().execute()
    if not lead_resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    tenant_resp = await (
        db.table("tenants")
        .select("*")
        .eq("id", str(lead_resp.data["tenant_id"]))
        .maybe_single()
        .execute()
    )

    try:
        updated = await advance_stage(
            lead=lead_resp.data,
            new_stage=body.new_stage,
            tenant=tenant_resp.data,
            triggered_by=body.triggered_by,
            conversion_value=body.conversion_value,
        )
        return updated
    except StageValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

- [ ] **Step 3: Write routers/tenants.py**

```python
from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from app.database import get_db
from app.models.tenant import TenantCreate, TenantUpdate
from app.services.evolution import provision_instance

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("")
async def list_tenants(db=Depends(get_db)):
    resp = await db.table("tenants").select("*").order("created_at", desc=True).execute()
    return resp.data


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: UUID, db=Depends(get_db)):
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return resp.data


@router.post("")
async def create_tenant(body: TenantCreate, db=Depends(get_db)):
    resp = await db.table("tenants").insert(body.model_dump()).execute()
    tenant = resp.data[0]
    # Auto-provision Evolution API instance
    try:
        await provision_instance(tenant)
    except Exception as e:
        import logfire
        logfire.error("evolution_provision_failed", tenant=tenant["slug"], error=str(e))
    return tenant


@router.patch("/{tenant_id}")
async def update_tenant(tenant_id: UUID, body: TenantUpdate, db=Depends(get_db)):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = await db.table("tenants").update(update_data).eq("id", str(tenant_id)).execute()
    return resp.data[0]
```

- [ ] **Step 4: Write routers/whatsapp.py**

```python
from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from app.database import get_db
from app.services.evolution import get_or_refresh_qr

router = APIRouter(prefix="/api/tenants", tags=["whatsapp"])


@router.get("/{tenant_id}/whatsapp/qr")
async def get_whatsapp_qr(tenant_id: UUID, db=Depends(get_db)):
    resp = await db.table("tenants").select("*").eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = resp.data
    if tenant.get("evolution_instance_status") == "connected":
        return {"status": "connected", "base64": None}

    qr = await get_or_refresh_qr(tenant)
    return qr


@router.get("/{tenant_id}/whatsapp/status")
async def get_whatsapp_status(tenant_id: UUID, db=Depends(get_db)):
    resp = await db.table("tenants").select(
        "evolution_instance_status, evolution_api_instance"
    ).eq("id", str(tenant_id)).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return resp.data
```

- [ ] **Step 5: Write routers/debug.py**

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_ads import upload_conversion

router = APIRouter(prefix="/debug", tags=["debug"])


class DebugConversionRequest(BaseModel):
    gclid: str
    stage: int = 1
    tenant_id: str
    dry_run: bool = True


@router.post("/conversion")
async def debug_conversion(body: DebugConversionRequest):
    if body.dry_run:
        return {
            "dry_run": True,
            "would_send": {
                "gclid": body.gclid,
                "stage": body.stage,
                "tenant_id": body.tenant_id,
            }
        }
    # Non-dry run: use a synthetic lead/tenant for manual testing
    lead = {"id": "debug", "gclid": body.gclid, "stage": body.stage,
            "first_message_at": None, "qualified_at": None, "converted_at": None, "conversion_value": None}
    tenant = {"google_ads_customer_id": body.tenant_id,
              "google_ads_conversion_new_lead": "debug_lead",
              "google_ads_conversion_qualified": "debug_qualified",
              "google_ads_conversion_converted": "debug_converted"}
    result = await upload_conversion(lead=lead, stage=body.stage, tenant=tenant)
    return result
```

- [ ] **Step 6: Register all routers in main.py**

```python
# main.py — full router registration
from app.routers import track, webhooks, leads, tenants, whatsapp, debug

app.include_router(track.router)
app.include_router(webhooks.router)
app.include_router(leads.router)
app.include_router(tenants.router)
app.include_router(whatsapp.router)
app.include_router(debug.router)
```

- [ ] **Step 7: Run all tests**

```bash
pytest tests/ -v
# All tests must PASS
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/routers/
git commit -m "feat(backend): leads, tenants, whatsapp, debug routers"
```

---

### Task 12: Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Build locally to verify**

```bash
cd backend
docker build -t rastreamento-backend .
# Must complete without errors
```

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat(backend): Dockerfile for production"
```

---

### Task 13: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
cd backend
pytest tests/ -v --tb=short
# All tests must PASS
```

- [ ] **Step 2: Start server locally and hit health endpoint**

```bash
cp .env.example .env
# Fill in at minimum: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EVOLUTION_API_BASE_URL, EVOLUTION_API_GLOBAL_KEY, SECRET_KEY
uvicorn app.main:app --reload
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "test(backend): all backend tests passing"
```
