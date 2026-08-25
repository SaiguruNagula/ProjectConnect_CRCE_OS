"""The principal's institution dashboard (Phase 11).

Every figure this endpoint returns belongs to another module, so the assertions
below almost never state a total. They compare: the headcount against the users
module's own overview, the project split against the Credit Engine's completion
write, the credit total against the balances the directory shows, and the
problem and team counts against rows the test itself created and then hid. A
number this file hardcoded would only prove that two copies of the same rule
agree with each other.

What is asserted outright is the boundary — that the endpoint is the
principal's alone, that an admin does not inherit it, and that neither a second
institution's rows nor a query parameter naming that institution can reach it.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import ProblemStatus, UserRole
from app.modules.teams.models import Team
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import approved_project, award
from tests.test_credits import seeded_rules as _seeded_rules

seeded_rules = _seeded_rules

# The keys repositories/api/analytics.repository.ts reads off the response.
FIELDS = {
    "institution_name",
    "students",
    "faculty",
    "active_projects",
    "completed_projects",
    "open_problems",
    "active_teams",
    "total_credits",
    # Phase 13. The sections themselves are asserted in test_analytics.py; here
    # they only have to arrive, because the repository destructures all three.
    "departments",
    "growth",
    "avg_review_days",
}

# Every role turned away. An admin is among them: the admin console is the user
# directory, and nothing says the two roles see the same institution.
OTHER_ROLES = [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN]


@pytest.fixture
def principal(db: Session, institution_a):
    return make_user(
        db, institution=institution_a, email="sunita.rao@crce.edu", role=UserRole.PRINCIPAL
    )


@pytest.fixture
def admin(db: Session, institution_a):
    return make_user(
        db, institution=institution_a, email="rohan.mehta@crce.edu", role=UserRole.ADMIN
    )


def dashboard(client: TestClient, principal, **params) -> dict:
    response = client.get(
        "/api/v1/dashboard/principal",
        params=params,
        headers=auth_header(client, principal.email),
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def make_team(db: Session, *, institution, problem, leader, name: str) -> Team:
    team = Team(
        institution_id=institution.id,
        problem_id=problem.id,
        name=name,
        pitch="On-device inference, no cloud round trip.",
        leader_id=leader.id,
        looking_for=[],
    )
    db.add(team)
    db.flush()
    return team


# --- who may read the institution --------------------------------------------------


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_no_role_but_principal_reads_the_institution(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    intruder = make_user(
        db, institution=institution_a, email=f"{role.value}@crce.edu", role=role
    )

    response = client.get(
        "/api/v1/dashboard/principal", headers=auth_header(client, intruder.email)
    )

    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"


def test_the_institution_is_closed_to_anonymous_callers(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/principal")

    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_a_principal_still_cannot_read_the_admin_directory(
    client: TestClient, principal
) -> None:
    # Phase 11 gave the principal counts, not people. The directory stayed where
    # §7 put it, and this is the assertion that would fail if it were widened.
    headers = auth_header(client, principal.email)

    assert client.get("/api/v1/users", headers=headers).status_code == 403
    assert client.get("/api/v1/users/overview", headers=headers).status_code == 403


# --- the response the repository maps ----------------------------------------------


def test_the_response_carries_every_field_the_repository_reads(
    client: TestClient, principal, institution_a
) -> None:
    counters = dashboard(client, principal)

    assert set(counters) == FIELDS
    # The formal name, which is what the console's heading shows.
    assert counters["institution_name"] == institution_a.full_name


def test_an_institution_with_nothing_in_it_counts_zero(
    client: TestClient, db: Session, institution_b
) -> None:
    lone_principal = make_user(
        db, institution=institution_b, email="head@other.edu", role=UserRole.PRINCIPAL
    )

    counters = dashboard(client, lone_principal)

    # The principal is the only account, and they are neither student nor
    # faculty. Everything else is genuinely empty, and reads as zero rather
    # than as an absent key the browser would render blank.
    assert counters == {
        "institution_name": institution_b.full_name,
        "students": 0,
        "faculty": 0,
        "active_projects": 0,
        "completed_projects": 0,
        "open_problems": 0,
        "active_teams": 0,
        "total_credits": 0,
        # Empty, not zeroed: an institution with no departments has no rows, and
        # six months of flat zeros would describe a history it has not lived.
        "departments": [],
        "growth": [],
        # Null rather than 0.0 — nothing has been reviewed, so there is no
        # turnaround, and zero would claim an instant one.
        "avg_review_days": None,
    }


# --- each count is its owner's -----------------------------------------------------


def test_the_headcount_is_the_one_the_users_module_reports(
    client: TestClient, principal, admin, student, faculty
) -> None:
    overview = client.get(
        "/api/v1/users/overview", headers=auth_header(client, admin.email)
    ).json()["data"]

    counters = dashboard(client, principal)

    # Same institution, same two roles, counted by the module that owns them —
    # so the console and the admin directory can never disagree.
    assert counters["students"] == overview["students"]
    assert counters["faculty"] == overview["faculty"]


def test_a_project_is_active_until_the_credit_engine_completes_it(
    client: TestClient, principal, faculty, student, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    before = dashboard(client, principal)
    assert (before["active_projects"], before["completed_projects"]) == (1, 0)

    assert award(client, faculty, project_id).status_code == 200

    after = dashboard(client, principal)
    # `completed_at` is written by the award, and the two counts are complements
    # of one list: the project moved across, it was not counted twice.
    assert (after["active_projects"], after["completed_projects"]) == (0, 1)


def test_the_project_split_totals_what_the_faculty_dashboard_mentors(
    client: TestClient, principal, faculty, student, problem
) -> None:
    approved_project(client, student, faculty, problem)

    counters = dashboard(client, principal)
    mentored = client.get(
        "/api/v1/dashboard/faculty", headers=auth_header(client, faculty.email)
    ).json()["data"]["projects_mentored"]

    # The institution's only mentor mentors every project in it.
    assert counters["active_projects"] + counters["completed_projects"] == mentored


def test_the_credit_total_is_the_sum_of_the_balances_the_directory_shows(
    client: TestClient, principal, admin, faculty, student, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    counters = dashboard(client, principal)
    directory = client.get(
        "/api/v1/users", headers=auth_header(client, admin.email)
    ).json()["data"]["items"]

    # The award pays the student and the mentor. Both sides read
    # SUM(credit_transactions.points); neither adds a second definition.
    assert counters["total_credits"] > 0
    assert counters["total_credits"] == sum(row["credits"] for row in directory)


def test_open_problems_counts_only_the_open_ones(
    client: TestClient, db: Session, principal, institution_a, faculty, problem
) -> None:
    make_problem(
        db,
        institution=institution_a,
        author=faculty,
        title="Campus Energy Telemetry",
        status=ProblemStatus.CLOSED,
    )

    # Two problems in the catalog, one still open. Nothing in the product writes
    # CLOSED yet, so the filter is asserted against a row placed there directly.
    assert dashboard(client, principal)["open_problems"] == 1


def test_active_teams_leaves_out_the_deleted_ones(
    client: TestClient, db: Session, principal, institution_a, student, problem
) -> None:
    make_team(db, institution=institution_a, problem=problem, leader=student, name="Vision")
    disbanded = make_team(
        db, institution=institution_a, problem=problem, leader=student, name="Telemetry"
    )
    disbanded.deleted_at = datetime.now(UTC)
    db.flush()

    # A team has no status column: it is live until it is soft-deleted, and that
    # is the whole of the lifecycle the teams module owns.
    assert dashboard(client, principal)["active_teams"] == 1


# --- one institution, and it is the token's ----------------------------------------


def test_another_college_is_not_in_these_counts(
    client: TestClient, db: Session, principal, institution_b, student, problem
) -> None:
    outsider = make_user(db, institution=institution_b, email="rao@other.edu")
    their_problem = make_problem(
        db, institution=institution_b, author=outsider, title="Their Problem"
    )
    make_team(
        db, institution=institution_b, problem=their_problem, leader=outsider, name="Theirs"
    )

    counters = dashboard(client, principal)

    assert counters["students"] == 1
    assert counters["open_problems"] == 1
    assert counters["active_teams"] == 0


def test_a_query_parameter_cannot_change_the_institution(
    client: TestClient, db: Session, principal, institution_b
) -> None:
    for index in range(3):
        make_user(db, institution=institution_b, email=f"s{index}@other.edu")

    named = dashboard(
        client,
        principal,
        institution_id=str(institution_b.id),
        user_id=str(uuid.uuid4()),
        principal_id=str(uuid.uuid4()),
    )

    # The institution is the token's. Naming another one changes nothing, and
    # naming a user changes nothing either — there is no parameter to hit.
    assert named == dashboard(client, principal)
    assert named["students"] == 0
