"""Liveness and readiness endpoints.

/health    — is the application process up? Never touches the database.
/health/db — is the database reachable? 503 when it is not, so a load balancer
             can tell "app running, database down" apart from "app down".
"""

from __future__ import annotations

from fastapi import APIRouter

from app.common.envelope import ok
from app.common.errors import ServiceUnavailableError
from app.core.config import get_settings
from app.db.session import database_reachable

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    settings = get_settings()
    return ok({"status": "ok", "env": settings.env, "version": "0.1.0"}, "Service is running.")


@router.get("/health/db")
def health_db() -> dict[str, object]:
    if not database_reachable():
        raise ServiceUnavailableError("The application is running but the database is unreachable.")
    return ok({"status": "ok", "database": "reachable"}, "Database is reachable.")
