"""Authentication behavior: login, token lifetime, refresh rotation, logout."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.audit import AuditLog
from app.common.enums import InstitutionStatus, UserRole, UserStatus
from app.core.config import get_settings
from app.modules.auth.models import RefreshToken
from tests.conftest import TEST_PASSWORD, auth_header, make_user


@pytest.fixture
def student(db: Session, institution_a):
    return make_user(db, institution=institution_a, email="asha@crce.edu.in")


def test_login_returns_tokens_and_user(client: TestClient, student):
    response = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["token_type"] == "bearer"
    assert data["access_token"] and data["refresh_token"]
    assert data["user"]["email"] == student.email
    assert data["user"]["role"] == "student"


def test_login_email_is_case_insensitive(client: TestClient, student):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": student.email.upper(), "password": TEST_PASSWORD},
    )
    assert response.status_code == 200


def test_wrong_password_and_unknown_email_are_indistinguishable(client: TestClient, student):
    wrong = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": "not-the-password"}
    )
    unknown = client.post(
        "/api/v1/auth/login", json={"email": "nobody@crce.edu.in", "password": TEST_PASSWORD}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["message"] == unknown.json()["message"]
    assert wrong.json()["error_code"] == unknown.json()["error_code"] == "UNAUTHENTICATED"


@pytest.mark.parametrize("status", [UserStatus.SUSPENDED, UserStatus.PENDING])
def test_inactive_account_cannot_log_in(client: TestClient, db, institution_a, status):
    user = make_user(
        db, institution=institution_a, email=f"{status.value}@crce.edu.in", status=status
    )
    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD}
    )
    assert response.status_code == 401


@pytest.mark.parametrize("status", [InstitutionStatus.SUSPENDED, InstitutionStatus.PENDING])
def test_a_non_active_institution_cannot_log_in(
    client: TestClient, db: Session, institution_a, student, status
):
    """Institution status is the deployment's local lifecycle gate (ADR-9)."""
    institution_a.status = status
    db.flush()

    response = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    )
    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_suspending_an_institution_stops_refresh(
    client: TestClient, db: Session, institution_a, student
):
    tokens = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    ).json()["data"]

    institution_a.status = InstitutionStatus.SUSPENDED
    db.flush()

    replayed = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replayed.status_code == 401


def test_lockout_after_repeated_failures(client: TestClient, db: Session, student):
    settings = get_settings()
    for _ in range(settings.max_failed_logins):
        client.post("/api/v1/auth/login", json={"email": student.email, "password": "wrong"})

    db.expire(student)
    assert student.locked_until is not None

    # The correct password is now refused too: the lock is on the account.
    response = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    )
    assert response.status_code == 401


def test_successful_login_clears_failure_counter(client: TestClient, db: Session, student):
    client.post("/api/v1/auth/login", json={"email": student.email, "password": "wrong"})
    db.expire(student)
    assert student.failed_login_attempts == 1

    client.post("/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD})
    db.expire(student)
    assert student.failed_login_attempts == 0
    assert student.last_login_at is not None


def test_login_is_audited(client: TestClient, db: Session, student):
    client.post("/api/v1/auth/login", json={"email": student.email, "password": "wrong"})
    client.post("/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD})

    actions = db.execute(select(AuditLog.action).order_by(AuditLog.created_at)).scalars().all()
    assert "login.failed" in actions
    assert "login.succeeded" in actions


def test_refresh_rotates_and_revokes_the_old_token(client: TestClient, db: Session, student):
    first = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    ).json()["data"]

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert rotated.status_code == 200
    assert rotated.json()["data"]["refresh_token"] != first["refresh_token"]

    replayed = client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert replayed.status_code == 401


def test_refresh_reuse_revokes_the_whole_family(client: TestClient, db: Session, student):
    first = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    ).json()["data"]
    second = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]}
    ).json()["data"]

    client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})

    # Reuse of the stolen token invalidates the legitimate holder's token too.
    assert (
        client.post(
            "/api/v1/auth/refresh", json={"refresh_token": second["refresh_token"]}
        ).status_code
        == 401
    )


def test_access_token_is_rejected_by_the_refresh_endpoint(client: TestClient, student):
    tokens = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    ).json()["data"]
    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )
    assert response.status_code == 401


def test_logout_revokes_the_refresh_token(client: TestClient, db: Session, student):
    tokens = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": TEST_PASSWORD}
    ).json()["data"]

    logout = client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert logout.status_code == 204
    assert (
        client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        ).status_code
        == 401
    )
    stored = db.execute(select(RefreshToken)).scalars().all()
    assert all(row.revoked_at is not None for row in stored)


def test_logout_with_a_junk_token_is_not_an_error(client: TestClient):
    assert client.post("/api/v1/auth/logout", json={"refresh_token": "junk"}).status_code == 204


def test_me_returns_the_authenticated_user(client: TestClient, student):
    response = client.get("/api/v1/auth/me", headers=auth_header(client, student.email))
    assert response.status_code == 200
    assert response.json()["data"]["email"] == student.email


def test_role_change_invalidates_an_existing_access_token(
    client: TestClient, db: Session, student
):
    headers = auth_header(client, student.email)
    student.role = UserRole.ADMIN
    db.flush()

    # The token still says "student"; the row is authoritative, so it is refused.
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_expired_token_is_rejected(client: TestClient, student):
    settings = get_settings()
    expired = jwt.encode(
        {
            "sub": str(student.id),
            "role": student.role.value,
            "institution_id": str(student.institution_id),
            "type": "access",
            "jti": "expired",
            "exp": int((datetime.now(UTC) - timedelta(minutes=1)).timestamp()),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


def test_token_signed_with_another_secret_is_rejected(client: TestClient, student):
    forged = jwt.encode(
        {
            "sub": str(student.id),
            "role": "admin",
            "institution_id": str(student.institution_id),
            "type": "access",
            "jti": "forged",
            "exp": int((datetime.now(UTC) + timedelta(hours=1)).timestamp()),
        },
        "attacker-secret",
        algorithm="HS256",
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_unsigned_alg_none_token_is_rejected(client: TestClient, student):
    unsigned = jwt.encode(
        {
            "sub": str(student.id),
            "role": "admin",
            "institution_id": str(student.institution_id),
            "type": "access",
            "jti": "none",
            "exp": int((datetime.now(UTC) + timedelta(hours=1)).timestamp()),
        },
        key="",
        algorithm="none",
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {unsigned}"})
    assert response.status_code == 401


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": ""}, {"Authorization": "Basic abc"}, {"Authorization": "Bearer "}],
)
def test_missing_or_malformed_authorization_is_401(client: TestClient, headers):
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
