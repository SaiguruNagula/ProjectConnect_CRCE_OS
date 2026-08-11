"""Application configuration — every value comes from the environment.

Secrets are never hardcoded and never committed (see .env.example). Settings are
constructed once and injected via `get_settings()` so tests can override them.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "test", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    env: Environment = "development"
    debug: bool = False

    api_v1_prefix: str = "/api/v1"
    project_name: str = "ProjectConnect OS API"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/projectconnect"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_pre_ping: bool = True

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 14

    # Comma-separated in the environment, e.g. "http://localhost:5173,https://campus.edu".
    # NoDecode stops pydantic-settings from trying to JSON-decode it first.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    def assert_production_safe(self) -> None:
        """Fail fast rather than serve production traffic with development secrets."""
        if self.is_production and self.jwt_secret == "change-me-in-production":
            raise RuntimeError("JWT_SECRET must be set to a unique value in production.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
