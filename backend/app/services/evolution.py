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

        webhook_url = f"{settings.backend_url}/webhooks/evolution/{tenant['slug']}"
        await client.post(f"{base}/webhook/set/{instance_name}", headers=_headers(), json={
            "url": webhook_url,
            "webhook_by_events": True,
            "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        })

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
        sentry_sdk.capture_message(
            f"WhatsApp desconectado: tenant {tenant_slug}", level="warning"
        )
        await provision_instance(tenant)
