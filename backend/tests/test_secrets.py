"""Scenarios I and J: passwords and secrets must not escape.

Checks the concrete channels named in the brief — API responses, logs,
exception messages, the database, and the committed configuration files.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.modules.users.models import User
from tests.conftest import TEST_PASSWORD, auth_header, make_user

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def student(db: Session, institution_a):
    return make_user(db, institution=institution_a, email="asha@crce.edu.in")


def test_password_is_stored_only_as_a_bcrypt_hash(db: Session, student):
    stored = db.execute(select(User.password_hash)).scalars().one()
    assert stored != TEST_PASSWORD
    assert stored.startswith("$2b$")
    assert verify_password(TEST_PASSWORD, stored)


def test_the_same_password_hashes_differently_each_time():
    assert hash_password(TEST_PASSWORD) != hash_password(TEST_PASSWORD)


def test_no_endpoint_returns_a_password_hash(client: TestClient, student):
    headers = auth_header(client, student.email)
    bodies = [
        client.post(
            "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
        ).text,
        client.get("/api/v1/auth/me", headers=headers).text,
        client.get("/api/v1/institutions/me", headers=headers).text,
    ]
    for body in bodies:
        assert "password" not in body.lower()
        assert "$2b$" not in body


def test_the_user_repr_hides_credentials(student):
    assert TEST_PASSWORD not in repr(student)
    assert "$2b$" not in repr(student)
    assert student.email not in repr(student)


def test_failed_login_does_not_log_the_password(
    client: TestClient, student, caplog: pytest.LogCaptureFixture
):
    with caplog.at_level(logging.DEBUG):
        client.post(
            "/api/v1/auth/login", json={"email": student.email, "password": "hunter2-secret"}
        )
    assert "hunter2-secret" not in caplog.text


def test_a_server_error_response_carries_no_internals(db: Session, student, monkeypatch):
    from app.db.session import get_db
    from app.main import create_app
    from app.modules.auth import router as auth_router

    def explode(*args, **kwargs):
        raise RuntimeError(f"leaking {TEST_PASSWORD} and {get_settings().jwt_secret}")

    monkeypatch.setattr(auth_router.service, "login", explode)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    # raise_server_exceptions=False so the client sees the 500 the browser would.
    with TestClient(app, raise_server_exceptions=False) as unguarded:
        response = unguarded.post(
            "/api/v1/auth/login",
            json={"email": student.email, "password": TEST_PASSWORD},
        )

    assert response.status_code == 500
    assert TEST_PASSWORD not in response.text
    assert get_settings().jwt_secret not in response.text
    assert "RuntimeError" not in response.text


def test_audit_entries_carry_no_credentials(client: TestClient, db: Session, student):
    from app.common.audit import AuditLog

    client.post("/api/v1/auth/login", json={"email": student.email, "password": "wrong-one"})
    entries = db.execute(select(AuditLog)).scalars().all()
    assert entries
    for entry in entries:
        serialized = json.dumps(entry.meta)
        # Reasons like "bad_password" are fine; the credential itself is not.
        assert "wrong-one" not in serialized
        assert TEST_PASSWORD not in serialized
        assert "$2b$" not in serialized


@pytest.mark.parametrize("filename", [".env.example", "docker-compose.yml", "Dockerfile"])
def test_committed_config_contains_no_real_secrets(filename: str):
    path = BACKEND_ROOT / filename
    if not path.exists():
        path = BACKEND_ROOT.parent / filename
    text = path.read_text(encoding="utf-8")
    assert get_settings().jwt_secret not in text
    # Secret-looking keys must be empty, a ${VAR} reference, or an obvious
    # placeholder — anything else is a real value someone forgot to strip.
    for line in text.splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, _, value = line.partition("=")
        if not any(token in key.upper() for token in ("SECRET", "PASSWORD")):
            continue
        value = value.strip().strip("\"'").lower()
        placeholder = (
            not value
            or value.startswith("${")
            or any(hint in value for hint in ("replace", "change", "your", "example"))
        )
        assert placeholder, f"{filename}: {key.strip()} looks like a committed secret"


def test_env_file_is_git_ignored():
    gitignore = (BACKEND_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert ".env" in {line.strip() for line in gitignore}


def test_a_validation_error_does_not_echo_the_submitted_password(client: TestClient):
    """422 bodies list field names and reasons — never the value that was sent."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "s3cret-value-submitted"},
    )
    assert response.status_code == 422
    assert "s3cret-value-submitted" not in response.text
