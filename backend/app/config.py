from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_env_files() -> tuple[str, ...]:
    """Carrega .env da raiz do repositório e de backend/ (último prevalece)."""
    app_dir = Path(__file__).resolve().parent
    candidates = (
        app_dir.parents[1] / ".env",
        app_dir.parent / ".env",
        Path.cwd() / ".env",
    )
    seen: set[Path] = set()
    files: list[str] = []
    for path in candidates:
        resolved = path.resolve()
        if resolved.exists() and resolved not in seen:
            seen.add(resolved)
            files.append(str(resolved))
    return tuple(files) if files else (".env",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    backend_url: str = Field(
        default="http://localhost:8000",
        validation_alias=AliasChoices("BACKEND_URL", "NEXT_PUBLIC_BACKEND_URL"),
    )
    allowed_origins: str = "http://localhost:3000"
    secret_key: str = "dev-secret-key"

    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    )
    supabase_anon_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        ),
    )
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    google_ads_developer_token: str = ""
    google_ads_client_id: str = ""
    google_ads_client_secret: str = ""
    google_ads_refresh_token: str = ""
    google_ads_mcc_id: str = ""

    evolution_api_base_url: str = ""
    evolution_api_global_key: str = ""

    ipapi_key: str = ""
    sentry_dsn: str = ""
    sentry_auth_token: str = ""
    logfire_token: str = ""

    @model_validator(mode="after")
    def _sync_supabase_aliases(self) -> "Settings":
        """Garante URL/anon preenchidos quando só existem variáveis NEXT_PUBLIC_."""
        import os

        if not self.supabase_url:
            self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        if not self.supabase_anon_key:
            self.supabase_anon_key = (
                os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
                or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
                or ""
            )
        if not self.backend_url or self.backend_url == "http://localhost:8000":
            public_backend = os.getenv("NEXT_PUBLIC_BACKEND_URL")
            if public_backend:
                self.backend_url = public_backend
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def logfire_enabled(self) -> bool:
        return bool(self.logfire_token and self.logfire_token.startswith("pylf_"))

    @property
    def sentry_enabled(self) -> bool:
        """DSN válido: https://...@....ingest.sentry.io/..."""
        return bool(self.sentry_dsn and "://" in self.sentry_dsn)

    def is_configured(self) -> dict[str, bool]:
        """Resumo para health/debug — não expõe valores."""
        return {
            "supabase": bool(self.supabase_url and self.supabase_service_role_key),
            "supabase_auth": bool(self.supabase_jwt_secret),
            "google_ads": bool(
                self.google_ads_developer_token
                and self.google_ads_client_id
                and self.google_ads_client_secret
                and self.google_ads_refresh_token
            ),
            "evolution": bool(self.evolution_api_base_url and self.evolution_api_global_key),
            "sentry": self.sentry_enabled,
            "logfire": self.logfire_enabled,
        }


settings = Settings()
