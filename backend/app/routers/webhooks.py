import asyncio
import secrets
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.services.classifier import classify_message
from app.services.pipeline import advance_stage, record_first_message
from app.services.evolution import handle_connection_update
from app.services.notifications import notify_new_lead
import logfire

router = APIRouter()


def _parse_message(payload: dict) -> tuple[str, str, str | None]:
    data = payload.get("data", {})
    remote_jid = data.get("key", {}).get("remoteJid", "")
    phone = remote_jid.split("@")[0]
    message_text = (
        data.get("message", {}).get("conversation")
        or data.get("message", {}).get("extendedTextMessage", {}).get("text")
        or ""
    )
    timestamp = data.get("messageTimestamp")
    try:
        first_message_at = (
            datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
            if timestamp
            else datetime.now(timezone.utc).isoformat()
        )
    except (ValueError, OSError, OverflowError):
        first_message_at = datetime.now(timezone.utc).isoformat()
    return phone, message_text, first_message_at


@router.post("/webhooks/evolution/{slug}")
async def evolution_webhook(slug: str, payload: dict, request: Request):
    db = await get_db()

    with logfire.span("webhook.evolution", tenant_slug=slug):
        logfire.info("webhook_received", event_type=payload.get("event"), tenant=slug)

        tenant_resp = await (
            db.table("tenants")
            .select("*")
            .eq("slug", slug)
            .maybe_single()
            .execute()
        )
        if not tenant_resp.data:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant_secret = tenant_resp.data.get("evolution_webhook_secret")
        if tenant_secret:
            incoming = request.headers.get("x-webhook-secret", "")
            if not secrets.compare_digest(incoming, tenant_secret):
                logfire.warn("webhook_unauthorized", tenant=slug)
                raise HTTPException(status_code=401, detail="Unauthorized")

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
                expires_at = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
                await db.table("tenants").update({
                    "evolution_qr_code": qr_base64,
                    "evolution_qr_expires_at": expires_at,
                }).eq("slug", slug).execute()
            return {"ok": True}

        if event == "MESSAGES_UPSERT":
            phone, message_text, first_message_at = _parse_message(payload)
            key = payload.get("data", {}).get("key", {})
            remote_jid = key.get("remoteJid", "")

            if "@g.us" in remote_jid:
                return {"ok": True}

            if key.get("fromMe", False):
                return {"ok": True}

            lead_resp = await (
                db.table("leads")
                .select("*")
                .eq("tenant_id", str(tenant["id"]))
                .eq("phone", phone)
                .execute()
            )

            if not lead_resp.data:
                insert_resp = await db.table("leads").insert({
                    "tenant_id": str(tenant["id"]),
                    "phone": phone,
                    "stage": 1,
                    "first_message_at": first_message_at,
                }).execute()
                lead = insert_resp.data[0]
                logfire.info("new_lead_from_webhook", phone=phone, tenant=slug)
                asyncio.create_task(notify_new_lead(str(tenant["id"]), lead))
            else:
                lead = lead_resp.data[0]

            lead = await record_first_message(lead, tenant, first_message_at)

            if message_text and lead["stage"] < 3:
                new_stage = classify_message(message_text, tenant, lead)
                if new_stage:
                    conversion_value = (
                        tenant.get("conversion_value_converted")
                        if new_stage == 3
                        else None
                    )
                    try:
                        await advance_stage(
                            lead=lead,
                            new_stage=new_stage,
                            tenant=tenant,
                            triggered_by="auto",
                            conversion_value=conversion_value,
                        )
                    except Exception as e:
                        logfire.warn("auto_advance_failed", lead_id=str(lead["id"]), error=str(e))

        return {"ok": True}
