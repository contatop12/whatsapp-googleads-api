from supabase import AClient, acreate_client
from app.config import settings

_client: AClient | None = None


async def get_db() -> AClient:
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client
