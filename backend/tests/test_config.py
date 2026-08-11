"""CORS_ORIGINS arrives as a comma-separated string, never as JSON."""

from __future__ import annotations

from app.core.config import Settings


def test_cors_origins_parses_a_comma_separated_list(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, https://campus.edu")
    assert Settings().cors_origins == ["http://localhost:5173", "https://campus.edu"]


def test_cors_origins_falls_back_to_the_default(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert Settings(_env_file=None).cors_origins == ["http://localhost:5173"]


def test_production_rejects_the_placeholder_secret() -> None:
    settings = Settings(_env_file=None, env="production", jwt_secret="change-me-in-production")
    try:
        settings.assert_production_safe()
    except RuntimeError:
        return
    raise AssertionError("production must refuse the default JWT secret")
