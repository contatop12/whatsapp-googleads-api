from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Header
import jwt
from jwt.exceptions import PyJWTError

from app.database import get_db

_supabase_pubkey = None


def set_supabase_pubkey(key) -> None:
    global _supabase_pubkey
    _supabase_pubkey = key


@dataclass
class AuthContext:
    user_id: str
    tenant_id: str | None
    role: str
    is_admin: bool


def _decode_supabase_jwt(token: str) -> dict:
    if _supabase_pubkey is None:
        raise HTTPException(status_code=503, detail="Auth public key not loaded")
    return jwt.decode(
        token,
        _supabase_pubkey,
        algorithms=["ES256"],
        audience="authenticated",
    )


async def get_auth_context(
    authorization: str | None = Header(default=None),
) -> AuthContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = _decode_supabase_jwt(token)
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = await get_db()
    user_resp = await (
        db.table("users")
        .select("id,tenant_id,role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status_code=403, detail="User profile not found")

    profile = user_resp.data
    role = profile.get("role", "client")
    return AuthContext(
        user_id=user_id,
        tenant_id=str(profile["tenant_id"]) if profile.get("tenant_id") else None,
        role=role,
        is_admin=role in ("admin", "super_admin"),
    )


async def require_admin(auth: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if not auth.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth


def ensure_tenant_access(auth: AuthContext, tenant_id: UUID | str) -> None:
    if auth.is_admin:
        return
    if not auth.tenant_id or str(auth.tenant_id) != str(tenant_id):
        raise HTTPException(status_code=403, detail="Access denied for this tenant")


async def ensure_lead_access(auth: AuthContext, lead_id: UUID) -> dict:
    db = await get_db()
    lead_resp = await (
        db.table("leads")
        .select("*")
        .eq("id", str(lead_id))
        .maybe_single()
        .execute()
    )
    if not lead_resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_tenant_access(auth, lead_resp.data["tenant_id"])
    return lead_resp.data
