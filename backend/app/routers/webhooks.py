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

            lead_resp = await (
                db.table("leads")
                .select("*")
                .eq("tenant_id", str(tenant["id"]))
                .eq("phone", phone)
                .execute()
            )

            if not lead_resp.data:
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
