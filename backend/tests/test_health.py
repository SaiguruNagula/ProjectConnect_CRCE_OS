"""Foundation checks: envelope shape, error shape, and the liveness/database split."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.modules.health import router as health_router


def test_health_reports_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_request_id_header_is_returned(client: TestClient) -> None:
    assert client.get("/api/v1/health").headers.get("X-Request-ID")


def test_db_health_reports_503_when_database_is_unreachable(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(health_router, "database_reachable", lambda: False)
    response = client.get("/api/v1/health/db")
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error_code"] == "SERVICE_UNAVAILABLE"
    assert body["path"] == "/api/v1/health/db"
    assert body["errors"] == []


def test_unknown_route_uses_the_error_envelope(client: TestClient) -> None:
    body = client.get("/api/v1/does-not-exist").json()
    assert body["success"] is False
    assert body["error_code"] == "NOT_FOUND"
