"""Phase 3 attack scenarios: tenancy, roles, ownership and payload trust.

Every test asserts a denial. Cross-institution reads must be 404 (never 403),
because a 403 would confirm the row exists in another college's deployment.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from tests.conftest import auth_header, make_problem, make_user
from tests.test_applications import APPLICATION, IDEA, apply
from tests.test_problems import VALID_PROBLEM
from tests.test_projects import open_project
from tests.test_suggestions import create_suggestion, suggestion_payload
from tests.test_teams import create_team


@pytest.fixture
def other(db: Session, institution_b):
    """A complete second college: faculty, student, problem and team."""
    faculty = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )
    student = make_user(db, institution=institution_b, email="kiran@other.edu")
    return {
        "faculty": faculty,
        "student": student,
        "problem": make_problem(
            db, institution=institution_b, author=faculty, title="Their problem"
        ),
    }


# --- Cross-institution reads are 404 -----------------------------------------


def test_another_colleges_problem_does_not_exist(client: TestClient, student, other) -> None:
    response = client.get(
        f"/api/v1/problems/{other['problem'].id}", headers=auth_header(client, student.email)
    )

    assert response.status_code == 404
    assert response.json()["error_code"] == "NOT_FOUND"


def test_another_colleges_team_does_not_exist(client: TestClient, student, other) -> None:
    team = create_team(client, other["student"], other["problem"], name="Their Team")

    response = client.get(
        f"/api/v1/teams/{team['id']}", headers=auth_header(client, student.email)
    )

    assert response.status_code == 404


def test_another_colleges_project_does_not_exist(client: TestClient, student, other) -> None:
    project_id = open_project(client, other["student"], other["problem"])
    headers = auth_header(client, student.email)

    read = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    journey = client.get(f"/api/v1/projects/{project_id}/journey", headers=headers)

    assert read.status_code == 404
    assert journey.status_code == 404


def test_another_colleges_suggestion_does_not_exist(
    client: TestClient, student, other
) -> None:
    theirs = create_suggestion(
        client, other["student"], other["faculty"], submit=True
    )

    response = client.post(
        f"/api/v1/problem-suggestions/{theirs['id']}/decision",
        json={"decision": "approved", "feedback": ""},
        headers=auth_header(client, student.email),
    )

    assert response.status_code in (403, 404)
    assert response.status_code != 200


def test_no_write_reaches_another_colleges_problem(
    client: TestClient, student, other
) -> None:
    headers = auth_header(client, student.email)
    problem_id = other["problem"].id

    assert client.post(
        f"/api/v1/problems/{problem_id}/applications", json=APPLICATION, headers=headers
    ).status_code == 404
    assert client.put(
        f"/api/v1/problems/{problem_id}/bookmark", headers=headers
    ).status_code == 404
    assert client.post(
        "/api/v1/teams",
        json={
            "problem_id": str(problem_id),
            "name": "Trespass",
            "pitch": "Reaching across the tenant boundary.",
            "looking_for": [],
        },
        headers=headers,
    ).status_code == 404


def test_unknown_ids_are_404_not_a_leak(client: TestClient, student) -> None:
    headers = auth_header(client, student.email)
    missing = uuid.uuid4()

    for path in (
        f"/api/v1/problems/{missing}",
        f"/api/v1/teams/{missing}",
        f"/api/v1/projects/{missing}",
        f"/api/v1/projects/{missing}/journey",
    ):
        assert client.get(path, headers=headers).status_code == 404, path


# --- The client never supplies identity --------------------------------------


def test_a_forged_institution_id_is_ignored(
    client: TestClient, faculty, student, other, institution_a
) -> None:
    """§0: institution identity comes from the token, never from the request."""
    created = client.post(
        "/api/v1/problems",
        json=VALID_PROBLEM | {"institution_id": str(other["problem"].institution_id)},
        headers=auth_header(client, faculty.email),
    ).json()["data"]

    catalog = client.get(
        "/api/v1/problems",
        params={"institution_id": str(other["problem"].institution_id)},
        headers=auth_header(client, student.email),
    ).json()["data"]

    assert client.get(
        f"/api/v1/problems/{created['id']}", headers=auth_header(client, student.email)
    ).status_code == 200
    assert "Their problem" not in [item["title"] for item in catalog["items"]]


def test_a_forged_author_is_ignored(client: TestClient, faculty, other) -> None:
    """created_by comes from the token even when the body says otherwise."""
    stranger = str(other["faculty"].id)
    data = client.post(
        "/api/v1/problems",
        json=VALID_PROBLEM | {"created_by": stranger, "faculty_id": stranger},
        headers=auth_header(client, faculty.email),
    ).json()["data"]

    assert data["faculty_id"] == str(faculty.id)
    assert data["faculty_name"] == faculty.name


def test_a_student_cannot_forge_the_applicant(
    client: TestClient, student, other_student, problem
) -> None:
    data = apply(
        client, student, problem, student_id=str(other_student.id)
    ).json()["data"]

    assert [member["id"] for member in data["members"]] == [str(student.id)]
    assert client.get(
        "/api/v1/projects", headers=auth_header(client, other_student.email)
    ).json()["data"] == []


# --- Roles --------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("post", "/api/v1/teams", {"problem_id": None, "name": "x", "pitch": "x"}),
        ("post", "/api/v1/problem-suggestions", None),
    ],
)
def test_faculty_cannot_use_student_endpoints(
    client: TestClient, faculty, problem, method, path, body
) -> None:
    payload = body or suggestion_payload(faculty.id)
    if body:
        payload = payload | {"problem_id": str(problem.id), "looking_for": []}

    response = getattr(client, method)(
        path, json=payload, headers=auth_header(client, faculty.email)
    )

    assert response.status_code == 403


def test_students_cannot_publish_problems_or_drafts(
    client: TestClient, student
) -> None:
    headers = auth_header(client, student.email)

    assert client.post(
        "/api/v1/problems", json=VALID_PROBLEM, headers=headers
    ).status_code == 403
    assert client.post(
        "/api/v1/problems/drafts", json=VALID_PROBLEM, headers=headers
    ).status_code == 403
    assert client.get("/api/v1/problems/drafts", headers=headers).status_code == 403


# --- Ownership within a college ----------------------------------------------


def test_a_stranger_cannot_manage_someone_elses_team(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    stranger = auth_header(client, other_student.email)

    assert client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": other_student.email, "role": "Member"},
        headers=stranger,
    ).status_code == 403
    assert client.delete(
        f"/api/v1/teams/{team['id']}/members/{student.id}", headers=stranger
    ).status_code == 403


def test_a_stranger_cannot_touch_someone_elses_project(
    client: TestClient, student, other_student, problem
) -> None:
    project_id = open_project(client, student, problem)

    response = client.put(
        f"/api/v1/projects/{project_id}/idea",
        json=IDEA | {"title": "Hijack"},
        headers=auth_header(client, other_student.email),
    )

    assert response.status_code == 403


def test_a_student_cannot_decide_their_own_suggestion(
    client: TestClient, student, faculty
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    response = client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "approved", "feedback": ""},
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 403


# --- Authentication and payloads ---------------------------------------------


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/problems",
        "/api/v1/problems/drafts",
        "/api/v1/teams",
        "/api/v1/projects",
        "/api/v1/problem-suggestions",
        "/api/v1/mentors",
    ],
)
def test_phase_3_endpoints_require_authentication(client: TestClient, path) -> None:
    response = client.get(path)

    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_a_tampered_token_is_rejected(client: TestClient, student, problem) -> None:
    """Rewriting a claim invalidates the signature over it.

    The claims, not the last character of the signature: a 32-byte HMAC ends in
    43 base64url characters, so the final one carries only four significant bits
    and two others encode the same byte. Editing it leaves the signature intact
    about one time in sixteen, which made the earlier form of this test pass by
    luck. Every character before the last carries a full six bits.
    """
    scheme, token = auth_header(client, student.email)["Authorization"].split(" ")
    head, payload, signature = token.split(".")
    tampered = f"{head}.{'a' if payload[0] != 'a' else 'b'}{payload[1:]}.{signature}"

    response = client.get(
        f"/api/v1/problems/{problem.id}",
        headers={"Authorization": f"{scheme} {tampered}"},
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/v1/problems", {"title": "x"}),
        ("/api/v1/teams", {"name": "x"}),
        ("/api/v1/problem-suggestions", {"title": []}),
    ],
)
def test_malformed_payloads_fail_validation_not_the_server(
    client: TestClient, faculty, student, path, payload
) -> None:
    actor = faculty if path == "/api/v1/problems" else student

    response = client.post(path, json=payload, headers=auth_header(client, actor.email))

    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"
    assert response.json()["errors"]


def test_a_non_uuid_path_id_is_a_clean_422(client: TestClient, student) -> None:
    response = client.get(
        "/api/v1/projects/not-a-uuid", headers=auth_header(client, student.email)
    )

    assert response.status_code == 422


def test_domain_responses_never_carry_credentials(
    client: TestClient, student, faculty, problem
) -> None:
    """No password hash, token or secret leaks through the Phase 3 payloads."""
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)
    bodies = [
        client.get("/api/v1/problems", headers=headers).text,
        client.get(f"/api/v1/problems/{problem.id}", headers=headers).text,
        client.get(f"/api/v1/projects/{project_id}/journey", headers=headers).text,
        client.get("/api/v1/mentors", headers=headers).text,
    ]

    for body in bodies:
        lowered = body.lower()
        for secret in ("password", "password_hash", "secret", "refresh_token", "$2b$"):
            assert secret not in lowered, secret
        assert faculty.password_hash not in body
