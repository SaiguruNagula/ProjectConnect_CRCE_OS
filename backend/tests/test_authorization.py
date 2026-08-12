"""RBAC and institution isolation — the attack scenarios from the Phase 2 brief.

Every test here asserts a denial. A passing suite means the boundary holds; a
failing one means data crosses a tenant or a role.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from tests.conftest import auth_header, make_user


@pytest.fixture
def users(db: Session, institution_a, institution_b):
    return {
        "student_a": make_user(db, institution=institution_a, email="asha@crce.edu.in"),
        "faculty_a": make_user(
            db, institution=institution_a, email="rao@crce.edu.in", role=UserRole.FACULTY
        ),
        "admin_a": make_user(
            db, institution=institution_a, email="admin@crce.edu.in", role=UserRole.ADMIN
        ),
        "principal_a": make_user(
            db, institution=institution_a, email="principal@crce.edu.in", role=UserRole.PRINCIPAL
        ),
        "student_b": make_user(db, institution=institution_b, email="kiran@other.edu.in"),
        "admin_b": make_user(
            db, institution=institution_b, email="admin@other.edu.in", role=UserRole.ADMIN
        ),
    }


# --- Scenario A: cross-institution data access ------------------------------


def test_admin_cannot_read_another_institution(client: TestClient, users, institution_b):
    response = client.get(
        f"/api/v1/institutions/{institution_b.id}",
        headers=auth_header(client, users["admin_a"].email),
    )
    assert response.status_code == 404
    assert response.json()["error_code"] == "NOT_FOUND"


def test_admin_cannot_read_a_user_from_another_institution(client: TestClient, users):
    response = client.get(
        f"/api/v1/users/{users['student_b'].id}",
        headers=auth_header(client, users["admin_a"].email),
    )
    # 404, not 403: the existence of the other tenant's row is not disclosed.
    assert response.status_code == 404


def test_directory_only_lists_the_callers_institution(client: TestClient, users):
    response = client.get("/api/v1/users", headers=auth_header(client, users["admin_a"].email))
    assert response.status_code == 200
    emails = {item["email"] for item in response.json()["data"]["items"]}
    assert emails == {
        users["student_a"].email,
        users["faculty_a"].email,
        users["admin_a"].email,
        users["principal_a"].email,
    }
    assert users["student_b"].email not in emails


def test_each_admin_sees_only_their_own_institution(client: TestClient, users, institution_a):
    a = client.get("/api/v1/institutions/me", headers=auth_header(client, users["admin_a"].email))
    b = client.get("/api/v1/institutions/me", headers=auth_header(client, users["admin_b"].email))
    assert a.json()["data"]["id"] == str(institution_a.id)
    assert b.json()["data"]["id"] != a.json()["data"]["id"]


# --- Scenario C: forged institution id --------------------------------------


def test_institution_id_in_the_request_is_ignored(client: TestClient, users, institution_b):
    """The token's institution wins over anything the client sends."""
    headers = auth_header(client, users["admin_a"].email)
    response = client.get(
        "/api/v1/users",
        headers=headers,
        params={"institution_id": str(institution_b.id), "institution": str(institution_b.id)},
    )
    assert response.status_code == 200
    emails = {item["email"] for item in response.json()["data"]["items"]}
    assert users["student_b"].email not in emails


# --- Scenario B / H: role escalation and insufficient permissions ------------


@pytest.mark.parametrize("actor", ["student_a", "faculty_a"])
def test_non_admin_roles_cannot_read_the_directory(client: TestClient, users, actor):
    response = client.get("/api/v1/users", headers=auth_header(client, users[actor].email))
    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"


@pytest.mark.parametrize("actor", ["admin_a", "principal_a"])
def test_admin_and_principal_can_read_the_directory(client: TestClient, users, actor):
    assert (
        client.get("/api/v1/users", headers=auth_header(client, users[actor].email)).status_code
        == 200
    )


def test_a_student_cannot_claim_a_role_it_does_not_have(client: TestClient, users):
    """The role travels in the signed token; the client has no say in it."""
    headers = auth_header(client, users["student_a"].email)
    headers["X-Role"] = "admin"
    response = client.get("/api/v1/users", headers=headers, params={"role": "admin"})
    assert response.status_code == 403


# --- Scenario G: unauthenticated ---------------------------------------------


@pytest.mark.parametrize(
    "path", ["/api/v1/users", "/api/v1/institutions/me", "/api/v1/auth/me"]
)
def test_protected_endpoints_require_authentication(client: TestClient, path):
    response = client.get(path)
    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


# --- Fail-safe ----------------------------------------------------------------


def test_unknown_user_id_is_404_not_a_leak(client: TestClient, users):
    response = client.get(
        f"/api/v1/users/{uuid.uuid4()}", headers=auth_header(client, users["admin_a"].email)
    )
    assert response.status_code == 404


def test_a_user_may_read_their_own_record(client: TestClient, users):
    student = users["student_a"]
    response = client.get(
        f"/api/v1/users/{student.id}", headers=auth_header(client, student.email)
    )
    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(student.id)
