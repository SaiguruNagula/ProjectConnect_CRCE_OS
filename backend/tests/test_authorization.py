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


@pytest.mark.parametrize("actor", ["student_a", "faculty_a", "principal_a"])
def test_non_admin_roles_cannot_read_the_directory(client: TestClient, users, actor):
    """§7: the user directory is admin-exclusive — principal included."""
    response = client.get("/api/v1/users", headers=auth_header(client, users[actor].email))
    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"


def test_admin_can_read_the_directory(client: TestClient, users):
    assert (
        client.get(
            "/api/v1/users", headers=auth_header(client, users["admin_a"].email)
        ).status_code
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


def test_a_user_reads_their_own_record_through_me_not_by_id(client: TestClient, users):
    """§15: ids in paths are for admin only; self-reads derive identity from the JWT."""
    student = users["student_a"]
    headers = auth_header(client, student.email)

    assert client.get(f"/api/v1/users/{student.id}", headers=headers).status_code == 403

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["data"]["id"] == str(student.id)


def test_non_admin_cannot_read_another_user_in_the_same_institution(client: TestClient, users):
    response = client.get(
        f"/api/v1/users/{users['admin_a'].id}",
        headers=auth_header(client, users["student_a"].email),
    )
    assert response.status_code == 403


# --- Scenario B (continued): one table per role-exclusive action ---------------
#
# Phase 14.7. The frontend now hides Apply, Bookmark and Suggest a Problem from
# everyone but students, and the router refuses the same three to everyone but
# students. Hiding is the courtesy; this table is the rule. Every write a single
# role owns is listed once, and every other role is pushed at it.
#
# The ids are deliberately random: the role gate is a dependency, so it answers
# before any handler looks a row up. A wrong role therefore gets 403 and never
# 404, which is also how the frontend can tell "not yours" from "not there".

ANY_ID = uuid.uuid4()

ROLE_EXCLUSIVE: list[tuple[str, str, str]] = [
    # student — the whole application and team-formation journey
    ("student", "post", f"/api/v1/problems/{ANY_ID}/applications"),
    ("student", "delete", f"/api/v1/problems/{ANY_ID}/applications/me"),
    ("student", "put", f"/api/v1/problems/{ANY_ID}/bookmark"),
    ("student", "delete", f"/api/v1/problems/{ANY_ID}/bookmark"),
    ("student", "post", "/api/v1/problem-suggestions"),
    ("student", "put", f"/api/v1/problem-suggestions/{ANY_ID}"),
    ("student", "put", f"/api/v1/projects/{ANY_ID}/idea"),
    ("student", "put", f"/api/v1/projects/{ANY_ID}/proof-of-concept"),
    ("student", "put", f"/api/v1/projects/{ANY_ID}/final"),
    ("student", "get", "/api/v1/teams"),
    ("student", "post", "/api/v1/teams"),
    ("student", "get", "/api/v1/teams/invitations"),
    ("student", "get", "/api/v1/teams/mine/join-requests"),
    ("student", "post", f"/api/v1/teams/{ANY_ID}/join-requests"),
    ("student", "get", "/api/v1/dashboard/student"),
    ("student", "get", "/api/v1/students/me/profile"),
    # faculty — authoring problems and every review decision
    ("faculty", "post", "/api/v1/problems"),
    ("faculty", "get", "/api/v1/problems/drafts"),
    ("faculty", "post", "/api/v1/problems/drafts"),
    ("faculty", "post", f"/api/v1/problem-suggestions/{ANY_ID}/decision"),
    ("faculty", "get", "/api/v1/reviews/queues"),
    ("faculty", "get", f"/api/v1/reviews/{ANY_ID}"),
    ("faculty", "post", f"/api/v1/reviews/{ANY_ID}/idea"),
    ("faculty", "post", f"/api/v1/projects/{ANY_ID}/credits"),
    ("faculty", "post", f"/api/v1/projects/{ANY_ID}/publication"),
    ("faculty", "get", "/api/v1/dashboard/faculty"),
    ("faculty", "get", "/api/v1/faculty/me/profile"),
    # admin — the directory and the audit trail
    ("admin", "get", "/api/v1/users"),
    ("admin", "get", "/api/v1/users/overview"),
    ("admin", "get", "/api/v1/audit/users"),
    # principal
    ("principal", "get", "/api/v1/dashboard/principal"),
]

OTHER_ROLES = {
    "student": ["faculty_a", "admin_a", "principal_a"],
    "faculty": ["student_a", "admin_a", "principal_a"],
    "admin": ["student_a", "faculty_a", "principal_a"],
    "principal": ["student_a", "faculty_a", "admin_a"],
}


def test_a_role_exclusive_action_refuses_every_other_role(client: TestClient, users):
    headers = {name: auth_header(client, user.email) for name, user in users.items()}

    for owner, method, path in ROLE_EXCLUSIVE:
        for actor in OTHER_ROLES[owner]:
            response = client.request(method.upper(), path, json={}, headers=headers[actor])
            assert response.status_code == 403, f"{actor} {method} {path}: {response.text}"
            assert response.json()["error_code"] == "FORBIDDEN"


def test_the_owning_role_is_not_stopped_by_the_role_gate(client: TestClient, users):
    """The other half of the table: it denies by role, not by default.

    What comes back may well be 404 or 422 — these are random ids and empty
    bodies. Anything but 403 means the gate opened for the role that owns it.
    """
    headers = {name: auth_header(client, user.email) for name, user in users.items()}

    for owner, method, path in ROLE_EXCLUSIVE:
        response = client.request(method.upper(), path, json={}, headers=headers[f"{owner}_a"])
        assert response.status_code != 403, f"{owner} {method} {path}: {response.text}"


def test_a_role_exclusive_action_is_closed_to_anonymous_callers(client: TestClient):
    """401, not 403 — the frontend ends the session on one and never on the other."""
    for _owner, method, path in ROLE_EXCLUSIVE:
        response = client.request(method.upper(), path, json={})
        assert response.status_code == 401, f"{method} {path}: {response.text}"
        assert response.json()["error_code"] == "UNAUTHENTICATED"
