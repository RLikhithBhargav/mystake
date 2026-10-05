from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "mystake-api"
    # Comma-separated list of allowed CORS origins for the web app.
    cors_origins: str = "http://localhost:3000"

    # Phase 3 — market data cache (Supabase Postgres via PostgREST)
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    quote_cache_ttl_seconds: int = 600  # 10 minutes
    alpha_vantage_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    @property
    def alpha_vantage_key_or_none(self) -> str | None:
        key = self.alpha_vantage_api_key.strip()
        return key or None


settings = Settings()
