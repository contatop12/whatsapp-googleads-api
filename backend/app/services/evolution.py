import httpx
import logfire
import sentry_sdk
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.database import get_db

WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]


def _headers() -> dict:
    return {
        "apikey": settings.evolution_api_global_key,
        "Content-Type": "application/json",
    }


def _instance_name(tenant: dict) -> str:
    return tenant.get("evolution_api_instance") or f"tenant_{tenant['slug']}"


def _expected_webhook_url(slug: str) -> str:
    return f"{settings.backend_url.rstrip('/')}/webhooks/evolution/{slug}"


def _webhook_body(url: str) -> dict:
    return {
        "enabled": True,
        "url": url,
        "webhookByEvents": True,
        "webhookBase64": False,
        "events": WEBHOOK_EVENTS,
    }


def _normalize_webhook_response(data: dict, expected_url: str) -> dict:
    nested = data.get("webhook") if isinstance(data.get("webhook"), dict) else {}
    actual_url = (data.get("url") or nested.get("url") or "").rstrip("/")
    expected = expected_url.rstrip("/")
    enabled = bool(data.get("enabled", nested.get("enabled", False)))
    events = data.get("events") or nested.get("events") or []
    return {
        "enabled": enabled,
        "url": actual_url or None,
        "expected_url": expected_url,
        "active": enabled and bool(actual_url) and actual_url == expected,
        "events": events,
    }


async def find_webhook(tenant: dict) -> dict:
    instance_name = _instance_name(tenant)
    expected_url = _expected_webhook_url(tenant["slug"])
    base = settings.evolution_api_base_url.rstrip("/")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{base}/webhook/find/{instance_name}",
            headers=_headers(),
        )

    if resp.status_code != 200:
        logfire.warn(
            "evolution_webhook_find_failed",
            tenant=tenant.get("slug"),
            status=resp.status_code,
        )
        return {
            "enabled": False,
            "url": None,
            "expected_url": expected_url,
            "active": False,
            "events": [],
            "error": f"Evolution API retornou {resp.status_code}",
        }

    data = resp.json() if resp.content else {}
    if isinstance(data, list) and data:
        data = data[0]
    return _normalize_webhook_response(data if isinstance(data, dict) else {}, expected_url)


async def configure_webhook(tenant: dict) -> dict:
    instance_name = _instance_name(tenant)
    webhook_url = _expected_webhook_url(tenant["slug"])
    base = settings.evolution_api_base_url.rstrip("/")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{base}/webhook/set/{instance_name}",
            headers=_headers(),
            json=_webhook_body(webhook_url),
        )

    if resp.status_code not in (200, 201):
        logfire.error(
            "evolution_webhook_set_failed",
            tenant=tenant.get("slug"),
            status=resp.status_code,
            body=resp.text[:500],
        )
        raise RuntimeError(f"Falha ao configurar webhook na Evolution ({resp.status_code})")

    logfire.info("evolution_webhook_configured", tenant=tenant["slug"], url=webhook_url)
    return await find_webhook(tenant)


def _parse_evolution_status(raw_state: str | None) -> str:
    if raw_state == "open":
        return "connected"
    if raw_state in ("close", "closed"):
        return "disconnected"
    return "connecting"


def _parse_instance_row(raw: dict) -> dict | None:
    inst = raw.get("instance") if isinstance(raw.get("instance"), dict) else raw
    if not isinstance(inst, dict):
        return None

    instance_name = inst.get("instanceName") or inst.get("name")
    if not instance_name:
        return None

    owner = inst.get("owner") or inst.get("number") or ""
    phone = owner.split("@")[0] if owner and "@" in owner else (owner or None)
    connection = inst.get("connection") if isinstance(inst.get("connection"), dict) else {}
    evolution_status = (
        inst.get("status")
        or inst.get("state")
        or inst.get("connectionStatus")
        or connection.get("state")
        or connection.get("status")
        or raw.get("status")
        or raw.get("state")
        or "close"
    )

    return {
        "instance_name": instance_name,
        "instance_id": inst.get("instanceId"),
        "phone": phone,
        "profile_name": inst.get("profileName"),
        "status": _parse_evolution_status(evolution_status),
        "evolution_status": evolution_status,
    }


async def _find_instance_by_name(instance_name: str) -> dict | None:
    for raw in await _fetch_instances_raw():
        parsed = _parse_instance_row(raw)
        if parsed and parsed["instance_name"] == instance_name:
            return parsed
    return None


async def _fetch_instances_raw() -> list[dict]:
    base = settings.evolution_api_base_url.rstrip("/")
    if not base or not settings.evolution_api_global_key:
        raise RuntimeError("Evolution API não configurada (EVOLUTION_API_BASE_URL / EVOLUTION_API_GLOBAL_KEY)")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{base}/instance/fetchInstances", headers=_headers())

    if resp.status_code != 200:
        raise RuntimeError(f"Evolution API retornou {resp.status_code} ao listar instâncias")

    data = resp.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        nested = data.get("response") or data.get("instances") or data.get("data")
        if isinstance(nested, list):
            return nested
    return []


async def list_evolution_instances() -> list[dict]:
    raw_instances = await _fetch_instances_raw()
    db = await get_db()
    tenants_resp = await (
        db.table("tenants")
        .select("id,name,slug,evolution_api_instance")
        .not_.is_("evolution_api_instance", "null")
        .execute()
    )
    linked_by_instance = {
        t["evolution_api_instance"]: {
            "id": t["id"],
            "name": t["name"],
            "slug": t["slug"],
        }
        for t in (tenants_resp.data or [])
        if t.get("evolution_api_instance")
    }

    seen: set[str] = set()
    result: list[dict] = []
    for raw in raw_instances:
        parsed = _parse_instance_row(raw)
        if not parsed or parsed["instance_name"] in seen:
            continue
        seen.add(parsed["instance_name"])
        linked = linked_by_instance.get(parsed["instance_name"])
        parsed["linked_tenant"] = linked
        result.append(parsed)

    result.sort(
        key=lambda i: (
            0 if i.get("status") == "connected" else 1,
            i.get("profile_name") or i.get("phone") or i["instance_name"],
        )
    )
    return result


async def associate_instance_to_tenant(tenant: dict, instance_name: str) -> dict:
    instance_name = instance_name.strip()
    if not instance_name:
        raise ValueError("Nome da instância é obrigatório")

    match = await _find_instance_by_name(instance_name)
    if not match:
        raise LookupError(f"Instância '{instance_name}' não encontrada na Evolution")

    db = await get_db()
    conflict_resp = await (
        db.table("tenants")
        .select("id,name,slug")
        .eq("evolution_api_instance", instance_name)
        .neq("id", str(tenant["id"]))
        .limit(1)
        .execute()
    )
    conflict_rows = conflict_resp.data if conflict_resp and conflict_resp.data else []
    if conflict_rows:
        other = conflict_rows[0]
        raise ValueError(
            f"Instância já vinculada ao cliente {other.get('name') or other.get('slug')}"
        )

    db_status = match["status"]
    await (
        db.table("tenants")
        .update({
            "evolution_api_instance": instance_name,
            "evolution_instance_status": db_status,
            "evolution_qr_code": None,
            "evolution_qr_expires_at": None,
        })
        .eq("id", str(tenant["id"]))
        .execute()
    )

    tenant_linked = {**tenant, "evolution_api_instance": instance_name}
    webhook = None
    webhook_error = None
    try:
        webhook = await configure_webhook(tenant_linked)
    except Exception as e:
        webhook_error = str(e)
        logfire.warn(
            "evolution_webhook_after_link_failed",
            tenant=tenant.get("slug"),
            instance=instance_name,
            error=webhook_error,
        )

    logfire.info(
        "evolution_instance_linked",
        tenant=tenant.get("slug"),
        instance=instance_name,
        phone=match.get("phone"),
    )

    return {
        "instance": match,
        "evolution_instance_status": db_status,
        "webhook": webhook,
        "webhook_error": webhook_error,
    }


async def provision_instance(tenant: dict) -> dict:
    instance_name = f"tenant_{tenant['slug']}"
    base = settings.evolution_api_base_url

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{base}/instance/fetchInstances", headers=_headers())
        instances = resp.json() if resp.status_code == 200 else []
        exists = any(
            i.get("instance", {}).get("instanceName") == instance_name
            for i in (instances if isinstance(instances, list) else [])
        )

        if not exists:
            await client.post(f"{base}/instance/create", headers=_headers(), json={
                "instanceName": instance_name,
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": True,
            })

        await client.post(
            f"{base}/webhook/set/{instance_name}",
            headers=_headers(),
            json=_webhook_body(_expected_webhook_url(tenant["slug"])),
        )

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
    db = await get_db()

    expires_at = tenant.get("evolution_qr_expires_at")
    qr_code = tenant.get("evolution_qr_code")

    if qr_code and expires_at:
        exp = datetime.fromisoformat(expires_at) if isinstance(expires_at, str) else expires_at
        if exp > datetime.now(timezone.utc):
            return {"base64": qr_code, "status": tenant.get("evolution_instance_status")}

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
        return {"base64": qr_data["base64"], "status": "connecting"}

    instance_obj = qr_data.get("instance", {})
    instance_state = (
        instance_obj.get("state")
        or instance_obj.get("status")
        or qr_data.get("state")
        or qr_data.get("status")
    )
    if instance_state == "open":
        await (
            db.table("tenants")
            .update({
                "evolution_instance_status": "connected",
                "evolution_qr_code": None,
            })
            .eq("id", str(tenant["id"]))
            .execute()
        )
        try:
            await configure_webhook(tenant)
        except Exception as e:
            logfire.warn(
                "evolution_webhook_sync_on_connect_failed",
                tenant=tenant.get("slug"),
                error=str(e),
            )
        logfire.info("whatsapp_already_connected_detected", tenant=tenant.get("slug"), instance=instance_name)
        return {"base64": None, "status": "connected"}

    return {"base64": None, "status": "connecting"}


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
        sentry_sdk.capture_message(
            f"WhatsApp desconectado: tenant {tenant_slug}", level="warning"
        )
        await provision_instance(tenant)
