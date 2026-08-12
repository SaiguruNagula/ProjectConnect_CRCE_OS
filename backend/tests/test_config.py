"""CORS_ORIGINS arrives as a comma-separated string, never as JSON."""

from __future__ import annotations

import pytest

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


STRONG_SECRET = "x" * 32


@pytest.mark.parametrize(
    ("overrides", "reason"),
    [
        ({"jwt_secret": "too-short", "deployment_id": "crce-prod-01"}, "a weak HS256 key"),
        ({"jwt_secret": STRONG_SECRET, "deployment_id": ""}, "a missing deployment id"),
    ],
)
def test_production_refuses_to_start_on(overrides: dict, reason: str) -> None:
    settings = Settings(_env_file=None, env="production", **overrides)
    with pytest.raises(RuntimeError):
        settings.assert_production_safe()


def test_a_correctly_configured_production_deployment_starts() -> None:
    Settings(
        _env_file=None,
        env="production",
        jwt_secret=STRONG_SECRET,
        deployment_id="crce-prod-01",
    ).assert_production_safe()


def test_development_does_not_require_a_deployment_id() -> None:
    """A laptop must stay zero-config; the guard is production-only."""
    Settings(_env_file=None).assert_production_safe()
