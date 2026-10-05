from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "mystake-api"
    # Comma-separated list of allowed CORS origins for the web app.
    cors_origins: str = "http://localhost:3000"

    # Supabase (quotes cache + coach portfolio load / persist / JWT user lookup)
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    quote_cache_ttl_seconds: int = 600  # 10 minutes
    alpha_vantage_api_key: str = ""

    # Phase 4 — LLM + LangSmith
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-4o-mini"
    langsmith_api_key: str = ""
    langsmith_project: str = "mystake"
    # Allow POST /coach/run with use_seed_portfolio for local smoke tests
    coach_allow_seed_portfolio: bool = False

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
