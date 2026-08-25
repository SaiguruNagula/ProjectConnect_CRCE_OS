"""The admin directory as the frontend consumes it (Phase 10).

Who may call these endpoints is already settled in test_authorization.py; what
this file guards is the row itself — that a directory entry carries the exact
field names the admin repository reads, that its credits are the Credit Engine's
balance and its projects the projects module's count rather than numbers this
module invented, that the overview counts the whole institution and not the page
above it, and that neither ever reaches past the caller's own tenant.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole, UserStatus
from tests.conftest import auth_header, make_user
from tests.test_credits import TOTAL, approved_project, award
from tests.test_credits import seeded_rules as _seeded_rules

seeded_rules = _seeded_rules

# The names repositories/api/admin.repository.ts reads off a directory row.
ROW_FIELDS = {
    "id",
    "name",
    "email",
    "role",
    "status",
    "department",
    "institution",
    "credits",
    "projects",
}
OVERVIEW_FIELDS = {"total", "students", "faculty", "principals", "pending", "suspended"}

# Every role the directory turns away. It is admin-exclusive, so a principal is
# as unauthorized here as a student.
OTHER_ROLES = [UserRole.STUDENT, UserRole.FACULTY, UserRole.PRINCIPAL]


@pytest.fixture
def admin(db: Session, institution_a):
    return make_user(
        db, institution=institution_a, email="rohan.mehta@crce.edu", role=UserRole.ADMIN
    )


def directory(client: TestClient, admin, **params) -> dict:
    response = client.get(
        "/api/v1/users", params=params, headers=auth_header(client, admin.email)
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def overview(client: TestClient, admin) -> dict:
    response = client.get("/api/v1/users/overview", headers=auth_header(client, admin.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def row_for(page: dict, user) -> dict:
    return next(row for row in page["items"] if row["id"] == str(user.id))


# --- who may read the directory ----------------------------------------------------


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_no_role_but_admin_reads_the_directory(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    intruder = make_user(
        db, institution=institution_a, email=f"{role.value}@crce.edu", role=role
    )
    headers = auth_header(client, intruder.email)

    listed = client.get("/api/v1/users", headers=headers)
    counted = client.get("/api/v1/users/overview", headers=headers)

    assert [listed.status_code, counted.status_code] == [403, 403]
    assert counted.json()["error_code"] == "FORBIDDEN"


def test_the_directory_is_closed_to_anonymous_callers(client: TestClient) -> None:
    counted = client.get("/api/v1/users/overview")

    assert counted.status_code == 401
    assert counted.json()["error_code"] == "UNAUTHENTICATED"


# --- the row the repository maps ---------------------------------------------------


def test_a_directory_row_carries_every_field_the_repository_reads(
    client: TestClient, db: Session, admin, student
) -> None:
    student.department = "Computer Engineering"
    db.flush()

    row = row_for(directory(client, admin), student)

    assert set(row) == ROW_FIELDS
    assert row["name"] == student.name
    assert row["email"] == student.email
    assert row["role"] == "student"
    assert row["status"] == "active"
    assert row["department"] == "Computer Engineering"
    # The short code, which is what the directory's institution column shows.
    assert row["institution"] == "CRCE"


def test_a_person_without_a_department_still_has_a_row(
    client: TestClient, admin, student
) -> None:
    # The column is nullable because every account predates it; the row must
    # still arrive, with the field present and empty rather than missing.
    row = row_for(directory(client, admin), student)

    assert row["department"] is None
    assert row["credits"] == 0
    assert row["projects"] == 0


def test_a_row_shows_the_credit_engine_balance(
    client: TestClient, admin, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    page = directory(client, admin)

    # The student's is the award; the mentor's is whatever mentorship paid them.
    # Neither is recomputed here — both are SUM(credit_transactions.points).
    assert row_for(page, student)["credits"] == TOTAL
    assert row_for(page, faculty)["credits"] > 0


def test_a_row_counts_projects_by_the_part_the_person_played(
    client: TestClient, admin, student, faculty, problem
) -> None:
    approved_project(client, student, faculty, problem)

    page = directory(client, admin)

    # The student worked on it, the faculty mentored it: one project each, from
    # the two different definitions the projects module owns.
    assert row_for(page, student)["projects"] == 1
    assert row_for(page, faculty)["projects"] == 1
    # An admin plays neither part, and is listed with none rather than omitted.
    assert row_for(page, admin)["projects"] == 0


def test_another_college_is_not_in_this_directory(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    outsider = make_user(db, institution=institution_b, email="rao@other.edu")

    page = directory(client, admin)

    assert str(outsider.id) not in {row["id"] for row in page["items"]}
    assert page["pagination"]["total_items"] == len(page["items"])


# --- the overview counts the institution, not the page -----------------------------


def test_the_overview_counts_every_role_and_status(
    client: TestClient, db: Session, admin, institution_a
) -> None:
    make_user(db, institution=institution_a, email="a@crce.edu", role=UserRole.FACULTY)
    make_user(db, institution=institution_a, email="b@crce.edu", role=UserRole.PRINCIPAL)
    make_user(db, institution=institution_a, email="c@crce.edu", status=UserStatus.PENDING)
    make_user(db, institution=institution_a, email="d@crce.edu", status=UserStatus.SUSPENDED)

    counts = overview(client, admin)

    assert set(counts) == OVERVIEW_FIELDS
    assert counts == {
        "total": 5,
        "students": 2,
        "faculty": 1,
        "principals": 1,
        "pending": 1,
        "suspended": 1,
    }


def test_the_overview_looks_past_the_page_it_sits_above(
    client: TestClient, db: Session, admin, institution_a
) -> None:
    for index in range(4):
        make_user(db, institution=institution_a, email=f"s{index}@crce.edu")

    page = directory(client, admin, limit=2)

    # Two rows on screen, five people in the institution: counting the page
    # would be wrong here, and wrong by more past the pagination cap.
    assert len(page["items"]) == 2
    assert overview(client, admin)["total"] == 5


def test_another_college_is_not_in_this_count(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    make_user(db, institution=institution_b, email="rao@other.edu")

    assert overview(client, admin)["total"] == 1


# --- identity is the token's -------------------------------------------------------


def test_the_overview_is_not_read_as_a_user_id(client: TestClient, admin) -> None:
    # `/users/overview` is declared above `/users/{user_id}`; were it not, this
    # would be a 422 on a uuid that never was one.
    response = client.get("/api/v1/users/overview", headers=auth_header(client, admin.email))

    assert response.status_code == 200


def test_a_query_parameter_cannot_widen_the_directory(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    outsider = make_user(db, institution=institution_b, email="rao@other.edu")

    page = directory(client, admin, institution_id=str(institution_b.id))
    counts = client.get(
        "/api/v1/users/overview",
        params={"institution_id": str(institution_b.id)},
        headers=auth_header(client, admin.email),
    )

    assert str(outsider.id) not in {row["id"] for row in page["items"]}
    assert counts.json()["data"]["total"] == 1
