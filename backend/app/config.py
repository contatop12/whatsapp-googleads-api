from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    backend_url: str = "http://localhost:8000"
    allowed_origins: str = "http://localhost:3000"
    secret_key: str = "dev-secret-key"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    google_ads_developer_token: str = ""
    google_ads_client_id: str = ""
    google_ads_client_secret: str = ""
    google_ads_refresh_token: str = ""

    evolution_api_base_url: str = ""
    evolution_api_global_key: str = ""

    ipapi_key: str = ""
    sentry_dsn: str = ""
    logfire_token: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
