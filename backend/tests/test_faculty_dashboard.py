"""The Faculty Dashboard: four impact metrics, each borrowed from its owner.

Same shape of argument as the Student Dashboard tests. The positive assertions
compare the dashboard against the value read through the owning module's own
endpoint, so a module that changes its mind fails these tests instead of quietly
disagreeing with the rail. The rest are negative: another mentor's projects,
another mentor's awards and another college's everything are not this faculty
member's impact, and no client-supplied id can make them so.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from tests.conftest import auth_header, make_problem, make_user
from tests.test_applications import apply
from tests.test_credits import TOTAL, approved_project, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_projects import open_project
from tests.test_teams import create_team

# The rule table the award endpoint prices from, re-exported so the tests that
# award credits can request it (the same borrowing test_faculty_credits does).
seeded_rules = _seeded_rules

FIELDS = {"projects_mentored", "students_guided", "credits_awarded", "solutions_published"}


def dashboard(client: TestClient, user, expect: int = 200) -> dict:
    response = client.get("/api/v1/dashboard/faculty", headers=auth_header(client, user.email))
    assert response.status_code == expect, response.text
    return response.json()["data"] if response.status_code == 200 else {}


def my_projects(client: TestClient, user) -> list[dict]:
    """The projects module's own answer to "what do I mentor"."""
    response = client.get("/api/v1/projects", headers=auth_header(client, user.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def another_mentor(db: Session, institution) -> tuple:
    """A colleague down the corridor, with a problem of their own."""
    faculty = make_user(
        db, institution=institution, email="colleague@crce.edu", role=UserRole.FACULTY
    )
    problem = make_problem(db, institution=institution, author=faculty, title="Lab Slot Scheduler")
    return faculty, problem


# --- authorization ----------------------------------------------------------------


def test_faculty_reads_their_own_dashboard(client: TestClient, faculty) -> None:
    body = dashboard(client, faculty)

    # A faculty member who has mentored nothing yet has mentored nothing yet.
    assert body == {
        "projects_mentored": 0,
        "students_guided": 0,
        "credits_awarded": 0,
        "solutions_published": 0,
    }


def test_anonymous_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/faculty")

    assert response.status_code == 401


def test_student_cannot_read_the_faculty_dashboard(client: TestClient, student) -> None:
    dashboard(client, student, expect=403)


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.PRINCIPAL])
def test_no_other_role_can_read_it_either(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    staff = make_user(db, institution=institution_a, email=f"{role.value}@crce.edu", role=role)

    dashboard(client, staff, expect=403)


def test_identity_comes_from_the_token_not_the_request(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    open_project(client, student, problem)
    colleague, their_problem = another_mentor(db, institution_a)
    open_project(client, other_student, their_problem)

    # There is no faculty id to supply; one smuggled in as a query parameter is
    # not read, so the caller still gets their own numbers.
    spoofed = client.get(
        "/api/v1/dashboard/faculty",
        params={"faculty_id": str(colleague.id), "user_id": str(colleague.id)},
        headers=auth_header(client, faculty.email),
    )

    assert spoofed.json()["data"]["projects_mentored"] == 1
    assert dashboard(client, colleague)["projects_mentored"] == 1


# --- the four metrics, against their owners ---------------------------------------


def test_projects_mentored_is_the_list_the_projects_module_keeps(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    open_project(client, student, problem)
    second = make_problem(db, institution=institution_a, author=faculty, title="Mess Menu")
    open_project(client, other_student, second)

    assert dashboard(client, faculty)["projects_mentored"] == len(my_projects(client, faculty))
    assert dashboard(client, faculty)["projects_mentored"] == 2


def test_a_colleagues_projects_are_not_mine(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    open_project(client, student, problem)
    _, their_problem = another_mentor(db, institution_a)
    open_project(client, other_student, their_problem)

    assert dashboard(client, faculty)["projects_mentored"] == 1
    assert dashboard(client, faculty)["students_guided"] == 1


def test_students_guided_is_the_roster_the_projects_module_composes(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    team = create_team(client, student, problem, name="Team Alpha")
    invitee = auth_header(client, other_student.email)
    client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": other_student.email, "role": "ML Engineer"},
        headers=auth_header(client, student.email),
    )
    inbox = client.get("/api/v1/teams/invitations", headers=invitee).json()["data"]
    accepted = client.post(f"/api/v1/teams/invitations/{inbox[0]['id']}/accept", headers=invitee)
    assert accepted.status_code == 200, accepted.text
    assert apply(client, student, problem, team_id=team["id"]).status_code == 201

    # The dashboard counts exactly the people the project cards list.
    guided = {
        member["id"] for project in my_projects(client, faculty) for member in project["members"]
    }
    assert dashboard(client, faculty)["students_guided"] == len(guided) == 2


def test_the_same_student_on_two_projects_is_one_student_guided(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    open_project(client, student, problem)
    second = make_problem(db, institution=institution_a, author=faculty, title="Mess Menu")
    open_project(client, student, second)

    body = dashboard(client, faculty)
    assert body["projects_mentored"] == 2
    assert body["students_guided"] == 1


def test_credits_awarded_is_the_credit_engines_live_awards(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    assert dashboard(client, faculty)["credits_awarded"] == 0  # nothing awarded yet
    assert award(client, faculty, project_id).status_code == 200

    assert dashboard(client, faculty)["credits_awarded"] == TOTAL


def test_a_revised_award_counts_once_at_its_new_value(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    assert award(client, faculty, project_id, bonus=60).status_code == 200

    # The superseded row is history, not a second award: 300, never 550.
    assert dashboard(client, faculty)["credits_awarded"] == TOTAL + 50


def test_a_colleagues_awards_are_not_mine(
    client: TestClient, db: Session, institution_a, other_student, faculty, seeded_rules
) -> None:
    colleague, their_problem = another_mentor(db, institution_a)
    project_id = approved_project(client, other_student, colleague, their_problem)
    award(client, colleague, project_id)

    assert dashboard(client, faculty)["credits_awarded"] == 0
    assert dashboard(client, colleague)["credits_awarded"] == TOTAL


def test_solutions_published_counts_the_published_flag_on_my_projects(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    published = approved_project(client, student, faculty, problem)
    second = make_problem(db, institution=institution_a, author=faculty, title="Mess Menu")
    approved_project(client, other_student, faculty, second)

    assert dashboard(client, faculty)["solutions_published"] == 0  # approved is not published
    assert publish(client, faculty, published).status_code == 200

    body = dashboard(client, faculty)
    assert body["projects_mentored"] == 2
    assert body["solutions_published"] == 1


def test_unpublishing_takes_it_back_off_the_count(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    publish(client, faculty, project_id)

    assert publish(client, faculty, project_id, publish=False).status_code == 200

    assert dashboard(client, faculty)["solutions_published"] == 0


# --- tenancy -----------------------------------------------------------------------


def test_another_institution_is_invisible(
    client: TestClient, db: Session, institution_b, faculty, seeded_rules
) -> None:
    their_faculty = make_user(
        db, institution=institution_b, email="mentor@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(
        db, institution=institution_b, email="builder@other.edu", role=UserRole.STUDENT
    )
    their_problem = make_problem(
        db, institution=institution_b, author=their_faculty, title="Hostel Laundry Queue"
    )
    project_id = approved_project(client, their_student, their_faculty, their_problem)
    award(client, their_faculty, project_id)
    publish(client, their_faculty, project_id)

    # Neither their projects, their students, their awards nor their published
    # work reach a mentor at another college.
    assert dashboard(client, faculty) == {
        "projects_mentored": 0,
        "students_guided": 0,
        "credits_awarded": 0,
        "solutions_published": 0,
    }
    assert dashboard(client, their_faculty)["credits_awarded"] == TOTAL


# --- nothing fabricated ------------------------------------------------------------


def test_the_response_carries_only_the_four_supported_metrics(client: TestClient, faculty) -> None:
    # No delta, no trend, no percentage, no pending-review count: the rail shows
    # what the platform records and nothing it does not.
    assert set(dashboard(client, faculty)) == FIELDS
