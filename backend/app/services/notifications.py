import asyncio
import logfire
import resend
from app.config import settings
from app.database import get_db


def _resend_configured() -> bool:
    return bool(settings.resend_api_key)


async def _get_tenant_emails(tenant_id: str, pref_key: str) -> list[str]:
    """Returns emails of users in tenant with the given notification preference enabled."""
    db = await get_db()
    resp = await (
        db.table("users")
        .select("email, notification_preferences")
        .eq("tenant_id", tenant_id)
        .execute()
    )
    emails: list[str] = []
    for row in resp.data or []:
        prefs = row.get("notification_preferences") or {}
        if prefs.get(pref_key, False) and row.get("email"):
            emails.append(row["email"])
    return emails


def _send_email_sync(to: list[str], subject: str, html: str) -> None:
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": settings.resend_from_email,
        "to": to,
        "subject": subject,
        "html": html,
    })


async def _send(to: list[str], subject: str, html: str) -> None:
    if not to:
        return
    try:
        await asyncio.get_event_loop().run_in_executor(
            None, _send_email_sync, to, subject, html
        )
        logfire.info("email_sent", to=to, subject=subject)
    except Exception as e:
        logfire.error("email_send_failed", error=str(e), to=to, subject=subject)


def _base(title: str, body: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#09090b;color:#e4e4e7;border-radius:12px">
      <div style="margin-bottom:20px">
        <span style="font-size:18px;font-weight:700;color:#ffffff">{title}</span>
      </div>
      <div style="background:#18181b;border-radius:8px;padding:16px;color:#a1a1aa;font-size:14px;line-height:1.6">
        {body}
      </div>
      <p style="margin-top:20px;font-size:11px;color:#52525b">
        GZapi · Você recebeu este email pois tem notificações ativas.
        <a href="#" style="color:#7F77DD">Gerenciar preferências</a>
      </p>
    </div>
    """


async def notify_lead_stage_changed(tenant_id: str, lead: dict, from_stage: int, to_stage: int) -> None:
    if not _resend_configured():
        return
    to = await _get_tenant_emails(tenant_id, "lead_stage_changed")
    if not to:
        return

    stage_label = {2: "Qualificado", 3: "Convertido"}.get(to_stage, f"Etapa {to_stage}")
    name = lead.get("name") or lead.get("phone") or "Lead"
    body = f"""
        <p><strong style="color:#e4e4e7">{name}</strong> avançou para <strong style="color:#7F77DD">{stage_label}</strong>.</p>
        <p>Etapa anterior: {from_stage} → Nova etapa: {to_stage}</p>
        {f'<p>Telefone: {lead["phone"]}' if lead.get('phone') else ''}
    """
    await _send(to, f"Lead avançou para {stage_label} — {name}", _base(f"Lead avançou de etapa", body))


async def notify_conversion_rejected(tenant_id: str, lead: dict, stage: int, response: dict) -> None:
    if not _resend_configured():
        return
    to = await _get_tenant_emails(tenant_id, "conversion_rejected")
    if not to:
        return

    name = lead.get("name") or lead.get("phone") or "Lead"
    body = f"""
        <p>Conversão da etapa <strong style="color:#f87171">{stage}</strong> foi <strong style="color:#f87171">rejeitada</strong> pelo Google Ads.</p>
        <p>Lead: <strong style="color:#e4e4e7">{name}</strong></p>
        <p style="font-size:12px;color:#71717a">Resposta: {str(response)[:300]}</p>
    """
    await _send(to, f"Conversão rejeitada — {name}", _base("Conversão rejeitada pelo Google Ads", body))


async def notify_new_lead(tenant_id: str, lead: dict) -> None:
    if not _resend_configured():
        return
    to = await _get_tenant_emails(tenant_id, "new_lead")
    if not to:
        return

    phone = lead.get("phone") or "desconhecido"
    body = f"""
        <p>Novo lead recebido via WhatsApp.</p>
        <p>Telefone: <strong style="color:#e4e4e7">{phone}</strong></p>
    """
    await _send(to, f"Novo lead — {phone}", _base("Novo lead recebido", body))


async def notify_whatsapp_disconnected(tenant_id: str, tenant_slug: str) -> None:
    if not _resend_configured():
        return
    to = await _get_tenant_emails(tenant_id, "whatsapp_disconnected")
    if not to:
        return

    body = f"""
        <p>A instância WhatsApp do tenant <strong style="color:#fbbf24">{tenant_slug}</strong> ficou <strong style="color:#f87171">desconectada</strong>.</p>
        <p>O sistema tentará reconectar automaticamente. Verifique o QR Code se necessário.</p>
    """
    await _send(to, f"WhatsApp desconectado — {tenant_slug}", _base("WhatsApp desconectado", body))
