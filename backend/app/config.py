from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

WEAK_SECRET_KEYS = frozenset(
    {
        "dev-secret-change-me-use-openssl-rand-hex-32",
        "change-me-use-openssl-rand-hex-32",
        "dev-secret",
        "change-me",
        "promptdb-dev-secret",
        "secret",
        "test",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://promptdb:promptdb@localhost:5432/promptdb"
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    allow_registration: bool = True
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"
    trust_proxy_headers: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.is_production:
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if self.secret_key.lower() in WEAK_SECRET_KEYS:
                raise ValueError("SECRET_KEY is too weak for production")
            if not self.cors_origin_list:
                raise ValueError("CORS_ORIGINS must be configured in production")
            if any(origin == "*" for origin in self.cors_origin_list):
                raise ValueError("CORS_ORIGINS must not contain wildcard in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
