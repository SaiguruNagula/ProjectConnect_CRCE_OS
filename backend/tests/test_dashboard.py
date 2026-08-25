"""The Student Dashboard: four counters, each borrowed from the module that owns it.

Most of what is asserted here is negative — that the dashboard did *not* invent a
number. The four positive assertions each compare the dashboard against the same
value read through its owner's own endpoint, so the day one of them changes its
mind, these tests fail rather than quietly disagreeing.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SelectionStatus, SubmissionStage, UserRole
from app.modules.projects.models import Project
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import approved_project, award, seeded_rules  # noqa: F401
from tests.test_leaderboard import credit
from tests.test_projects import open_project
from tests.test_reviews import FEEDBACK, decide, pending_idea, submit
from tests.test_teams import create_team

FIELDS = {"total_credits", "rank", "active_projects", "pending_tasks"}


def project_row(db: Session, project_id: str) -> Project:
    return db.get(Project, uuid.UUID(project_id))


def dashboard(client: TestClient, user, expect: int = 200) -> dict:
    response = client.get("/api/v1/dashboard/student", headers=auth_header(client, user.email))
    assert response.status_code == expect, response.text
    return response.json()["data"] if response.status_code == 200 else {}


def invite(client: TestClient, leader, invitee, problem, name: str = "Team Alpha") -> None:
    team = create_team(client, leader, problem, name=name)
    response = client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": invitee.email, "role": "ML Engineer"},
        headers=auth_header(client, leader.email),
    )
    assert response.status_code == 201, response.text


# --- authorization ---------------------------------------------------------------


def test_student_reads_their_own_dashboard(client: TestClient, student) -> None:
    body = dashboard(client, student)

    # A student who has done nothing yet has done nothing yet.
    assert body == {"total_credits": 0, "rank": None, "active_projects": 0, "pending_tasks": 0}


def test_anonymous_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/student")

    assert response.status_code == 401


def test_faculty_cannot_read_the_student_dashboard(client: TestClient, faculty) -> None:
    dashboard(client, faculty, expect=403)


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.PRINCIPAL])
def test_no_other_role_can_read_it_either(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    staff = make_user(db, institution=institution_a, email=f"{role.value}@crce.edu", role=role)

    dashboard(client, staff, expect=403)


def test_identity_comes_from_the_token_not_the_request(
    client: TestClient, db: Session, student, other_student
) -> None:
    credit(db, student, 400)
    credit(db, other_student, 90)

    # There is no student id to supply; one smuggled in as a query parameter is
    # not read, so the caller still gets their own numbers.
    spoofed = client.get(
        "/api/v1/dashboard/student",
        params={"student_id": str(other_student.id), "user_id": str(other_student.id)},
        headers=auth_header(client, student.email),
    )

    assert spoofed.json()["data"]["total_credits"] == 400
    assert dashboard(client, other_student)["total_credits"] == 90


# --- the four counters, against their owners --------------------------------------


def test_total_credits_is_the_credit_engine_balance(
    client: TestClient, db: Session, student
) -> None:
    credit(db, student, 300)
    # A correction is part of the balance; a dashboard that summed awards only
    # would miss it.
    credit(db, student, -50)

    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]

    assert dashboard(client, student)["total_credits"] == 250 == summary["total"]


def test_rank_is_the_row_the_leaderboard_already_computed(
    client: TestClient, db: Session, institution_a, student, other_student
) -> None:
    third = make_user(db, institution=institution_a, email="rhea.menon@crce.edu")
    credit(db, other_student, 900)
    credit(db, student, 500)
    credit(db, third, 100)

    board = client.get(
        "/api/v1/leaderboard/students", headers=auth_header(client, student.email)
    ).json()["data"]
    mine = next(entry for entry in board if entry["id"] == str(student.id))

    assert dashboard(client, student)["rank"] == mine["rank"] == 2
    assert dashboard(client, third)["rank"] == 3


def test_rank_is_null_for_a_student_the_board_does_not_list(
    client: TestClient, db: Session, student, other_student
) -> None:
    credit(db, other_student, 900)

    # Last place would be a number the platform never decided.
    assert dashboard(client, student)["rank"] is None


def test_active_projects_counts_what_the_credit_engine_has_not_completed(
    client: TestClient,
    db: Session,
    institution_a,
    student,
    faculty,
    problem,
    seeded_rules,  # noqa: F811
) -> None:
    second = make_problem(db, institution=institution_a, author=faculty, title="Lab Slot Booking")
    finished = approved_project(client, student, faculty, problem)
    open_project(client, student, second)

    assert dashboard(client, student)["active_projects"] == 2

    assert award(client, faculty, finished).status_code == 200
    db.expire_all()

    assert project_row(db, finished).completed_at is not None
    assert dashboard(client, student)["active_projects"] == 1


# --- pending tasks: the documented definition -------------------------------------


def test_pending_tasks_counts_returned_work_and_unanswered_invitations(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    returned = pending_idea(client, student, problem)
    decide(client, faculty, returned, SubmissionStage.IDEA, "changes", **FEEDBACK)

    second = make_problem(db, institution=institution_a, author=faculty, title="Lab Slot Booking")
    invite(client, other_student, student, second)

    assert dashboard(client, student)["pending_tasks"] == 2


def test_a_poc_changes_verdict_is_one_task_not_two(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "changes", **FEEDBACK)
    db.expire_all()

    # A revision request settles nothing on the project: `selection_status` is
    # still untouched, which is why the definition reads the submission alone.
    assert project_row(db, project_id).selection_status is SelectionStatus.NOT_REVIEWED
    assert dashboard(client, student)["pending_tasks"] == 1


def test_answered_work_stops_counting(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    returned = pending_idea(client, student, problem)
    decide(client, faculty, returned, SubmissionStage.IDEA, "changes", **FEEDBACK)
    assert dashboard(client, student)["pending_tasks"] == 1

    submit(client, student, returned, SubmissionStage.IDEA)

    assert dashboard(client, student)["pending_tasks"] == 0


def test_another_students_returned_work_is_not_my_task(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    theirs = pending_idea(client, other_student, problem)
    decide(client, faculty, theirs, SubmissionStage.IDEA, "changes", **FEEDBACK)

    assert dashboard(client, student)["pending_tasks"] == 0


# --- tenancy ----------------------------------------------------------------------


def test_another_institution_cannot_reach_this_dashboard(
    client: TestClient, db: Session, institution_a, institution_b, student, problem
) -> None:
    outsider = make_user(db, institution=institution_b, email="dev.rao@vjti.edu")
    their_faculty = make_user(
        db, institution=institution_b, email="asha.rane@vjti.edu", role=UserRole.FACULTY
    )
    their_problem = make_problem(db, institution=institution_b, author=their_faculty)

    credit(db, outsider, 5000)
    open_project(client, outsider, their_problem)
    invite(client, outsider, student, their_problem)
    credit(db, student, 100)

    mine = dashboard(client, student)

    # Their ledger, their projects and their invitation all stay on their side —
    # including the invitation, which names this student's email but belongs to a
    # team in another institution.
    assert mine == {
        "total_credits": 100,
        "rank": 1,
        "active_projects": 0,
        "pending_tasks": 0,
    }
    assert dashboard(client, outsider)["total_credits"] == 5000


# --- nothing fabricated -----------------------------------------------------------


def test_the_response_carries_only_the_four_supported_counters(client: TestClient, student) -> None:
    body = dashboard(client, student)

    # No delta, no trend, no department split, and above all no deadline: the
    # backend has no source for any of them, so it ships none of them.
    assert set(body) == FIELDS
