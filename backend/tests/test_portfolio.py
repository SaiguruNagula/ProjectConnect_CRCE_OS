"""The portfolio: a view of verified activity, not a record of it.

Nothing in this file writes a portfolio, because nothing can. Every assertion
checks that a number on the page is the number the module that owns it already
reports — the ledger for credits, `completed_at` for finished work, the
publication flag for solutions — and that a claim nobody verified never appears.
"""

from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.common.enums import ApplicationStatus, SubmissionStage, UserRole, UserStatus
from app.modules.credits import config
from app.modules.projects.models import Application, Project
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import TOTAL, approved_project, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_leaderboard import credit
from tests.test_reviews import decide, pending_idea

# The Phase 5A rule table, reused as-is. Bound under its fixture name here so
# pytest finds it in this module without a second copy of the seed.
seeded_rules = _seeded_rules

PORTFOLIO_KEYS = {
    "user_id",
    "name",
    "role",
    "email",
    "avatar_initials",
    "department",
    "total_credits",
    "level",
    "level_name",
    "stats",
    "projects",
}
STATS_KEYS = {
    "projects_completed",
    "verified_solutions",
    "problems_published",
    "reviews_completed",
}


def portfolio(client: TestClient, viewer) -> dict:
    response = client.get("/api/v1/portfolio/me", headers=auth_header(client, viewer.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def make_project(
    db: Session,
    *,
    problem,
    mentor,
    student=None,
    completed: bool = True,
    published: bool = False,
    title: str = "Campus navigation",
) -> Project:
    """A project row placed directly, so a test can state the exact shape it means."""
    project = Project(
        institution_id=mentor.institution_id,
        problem_id=problem.id,
        mentor_id=mentor.id,
        title=title,
        summary="Indoor wayfinding for the new academic block.",
        completed_at=datetime.now(UTC) if completed else None,
        published=published,
    )
    db.add(project)
    db.flush()
    if student is not None:
        db.add(
            Application(
                problem_id=problem.id,
                student_id=student.id,
                project_id=project.id,
                idea_summary="Beacon-based indoor positioning.",
                approach="Trilateration over BLE advertisements.",
                status=ApplicationStatus.ACTIVE,
            )
        )
        db.flush()
    return project


@contextmanager
def counting(db: Session):
    """Every SQL statement the block issues, so N+1 can be measured rather than eyeballed."""
    statements: list[str] = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    engine = db.get_bind().engine
    event.listen(engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", record)


# --- authorization ------------------------------------------------------------------


def test_a_portfolio_is_closed_to_anonymous_callers(client: TestClient) -> None:
    response = client.get("/api/v1/portfolio/me")

    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_a_portfolio_belongs_to_the_token_that_asked_for_it(
    client: TestClient, db: Session, student, other_student
) -> None:
    """There is no id to supply, so there is nobody else's portfolio to ask for."""
    credit(db, other_student, 500)

    mine = portfolio(client, student)

    assert mine["user_id"] == str(student.id)
    assert mine["total_credits"] == 0


def test_a_deleted_user_cannot_read_their_portfolio(
    client: TestClient, db: Session, student
) -> None:
    headers = auth_header(client, student.email)
    student.deleted_at = datetime.now(UTC)
    student.status = UserStatus.SUSPENDED
    db.flush()

    response = client.get("/api/v1/portfolio/me", headers=headers)

    assert response.status_code == 401


def test_there_is_no_portfolio_write_api(client: TestClient, student) -> None:
    headers = auth_header(client, student.email)
    for method in (client.post, client.put, client.patch, client.delete):
        assert method("/api/v1/portfolio/me", headers=headers).status_code == 405


def test_the_forbidden_portfolio_routes_do_not_exist(client: TestClient, student) -> None:
    """A portfolio is derived, so there is nothing to generate, rebuild or search."""
    headers = auth_header(client, student.email)
    for path in ("", str(uuid.uuid4()), "search", "me/customization", "me/export"):
        assert client.get(f"/api/v1/portfolio/{path}", headers=headers).status_code == 404
    for path in ("refresh", "rebuild", "generate", "export"):
        assert client.post(f"/api/v1/portfolio/{path}", headers=headers).status_code == 404


def test_the_endpoint_takes_no_parameters(
    client: TestClient, db: Session, institution_a, student
) -> None:
    """A supplied id or institution is ignored, not honoured."""
    outsider = make_user(db, institution=institution_a, email="ghost@crce.edu")
    credit(db, outsider, 900)

    spoofed = client.get(
        "/api/v1/portfolio/me",
        params={"user_id": str(outsider.id), "institution_id": str(uuid.uuid4())},
        headers=auth_header(client, student.email),
    )

    assert spoofed.status_code == 200
    assert spoofed.json()["data"]["user_id"] == str(student.id)


# --- identity -----------------------------------------------------------------------


def test_identity_comes_from_the_user_row(client: TestClient, student) -> None:
    page = portfolio(client, student)

    assert page["name"] == student.name
    assert page["email"] == student.email
    assert page["role"] == UserRole.STUDENT.value
    assert page["avatar_initials"] == "AS"


def test_department_is_the_one_the_user_set_on_their_profile(
    client: TestClient, student
) -> None:
    """Phase 5E gave `users` a department, so there is now something to report.

    Until the student fills it in there still is not: an unset department is
    null, never a guess borrowed from a problem they worked on.
    """
    assert portfolio(client, student)["department"] is None

    client.patch(
        "/api/v1/students/me/profile",
        json={"department": "Computer Engineering"},
        headers=auth_header(client, student.email),
    )

    assert portfolio(client, student)["department"] == "Computer Engineering"


def test_the_response_shape_is_the_same_for_every_role(
    client: TestClient, student, faculty
) -> None:
    for viewer in (student, faculty):
        page = portfolio(client, viewer)
        assert set(page) == PORTFOLIO_KEYS
        assert set(page["stats"]) == STATS_KEYS


def test_an_empty_portfolio_is_a_portfolio(client: TestClient, student) -> None:
    """A student who has done nothing yet gets zeroes, not a 404."""
    page = portfolio(client, student)

    assert page["projects"] == []
    assert page["total_credits"] == 0
    # Level 1 "Newcomer" is where the Credit Engine's ladder starts; the
    # portfolio does not invent a zeroth level of its own.
    assert (page["level"], page["level_name"]) == (1, "Newcomer")
    assert page["stats"]["projects_completed"] == 0
    assert page["stats"]["verified_solutions"] == 0


# --- which projects count -----------------------------------------------------------


def test_a_completed_project_is_portfolio_evidence(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student)

    page = portfolio(client, student)

    assert [p["title"] for p in page["projects"]] == ["Campus navigation"]
    assert page["stats"]["projects_completed"] == 1


def test_an_unfinished_project_is_not_presented_as_an_achievement(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """`completed_at` is set by the Credit Engine alone — nothing else finishes work."""
    make_project(db, problem=problem, mentor=faculty, student=student, completed=False)

    page = portfolio(client, student)

    assert page["projects"] == []
    assert page["stats"]["projects_completed"] == 0


def test_an_approved_final_project_is_not_complete_until_it_is_awarded(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """UD-1 end to end: approval is not completion, and the page says so both times."""
    project_id = approved_project(client, student, faculty, problem)

    assert portfolio(client, student)["projects"] == []

    assert award(client, faculty, project_id).status_code == 200
    after = portfolio(client, student)

    assert [p["id"] for p in after["projects"]] == [project_id]


def test_a_deleted_project_leaves_the_portfolio(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project = make_project(db, problem=problem, mentor=faculty, student=student)
    project.deleted_at = datetime.now(UTC)
    db.flush()

    assert portfolio(client, student)["projects"] == []


def test_another_students_project_is_not_borrowed(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=other_student)

    assert portfolio(client, student)["projects"] == []


def test_a_project_is_listed_once(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The membership clause is an OR over team and solo routes; it must not
    return the same project twice."""
    make_project(db, problem=problem, mentor=faculty, student=student)

    page = portfolio(client, student)
    ids = [p["id"] for p in page["projects"]]

    assert len(ids) == len(set(ids)) == 1
    assert page["stats"]["projects_completed"] == 1


# --- solutions ----------------------------------------------------------------------


def test_verified_solutions_count_published_projects(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """There is no Solutions Hub table yet; `projects.published` is the whole source."""
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    assert portfolio(client, student)["stats"]["verified_solutions"] == 1


def test_an_unpublished_project_is_not_a_solution(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student)

    assert portfolio(client, student)["stats"]["verified_solutions"] == 0


def test_publishing_through_the_api_shows_up_as_a_solution(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    assert publish(client, faculty, project_id).status_code == 200

    page = portfolio(client, student)
    assert page["stats"]["verified_solutions"] == 1
    # Published, but nobody has scored it, so it is not a completed project.
    assert page["projects"] == []


# --- the Credit Engine owns the numbers ---------------------------------------------


def test_portfolio_credits_are_the_ledger_balance(client: TestClient, db: Session, student) -> None:
    credit(db, student, 250)
    credit(db, student, 60)

    assert portfolio(client, student)["total_credits"] == 310


def test_portfolio_credits_agree_with_the_credit_summary(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """One economy: the two endpoints read the same ledger through the same function."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    page = portfolio(client, student)
    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]

    assert page["total_credits"] == summary["total"] == TOTAL
    assert page["level"] == summary["level"]
    assert page["level_name"] == summary["level_name"]


def test_the_level_is_the_credit_engine_ladder(client: TestClient, db: Session, student) -> None:
    credit(db, student, 350)

    page = portfolio(client, student)
    level, name, _next_name, _milestone = config.level_of(350)

    assert (page["level"], page["level_name"]) == (level, name)


def test_a_correction_lowers_the_portfolio_too(client: TestClient, db: Session, student) -> None:
    credit(db, student, 300)
    credit(db, student, -100)

    assert portfolio(client, student)["total_credits"] == 200


def test_reading_a_portfolio_writes_no_credits(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The page is a read. Loading it three times cannot pay anybody."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    for _ in range(3):
        portfolio(client, student)

    assert portfolio(client, student)["total_credits"] == TOTAL


# --- faculty ------------------------------------------------------------------------


def test_a_faculty_portfolio_lists_the_projects_they_mentored(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student)

    page = portfolio(client, faculty)

    assert page["role"] == UserRole.FACULTY.value
    assert [p["title"] for p in page["projects"]] == ["Campus navigation"]


def test_a_faculty_portfolio_counts_published_problems_and_reviews(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    pending = pending_idea(client, student, problem)
    decide(client, faculty, pending, SubmissionStage.IDEA, "approve")

    stats = portfolio(client, faculty)["stats"]

    # `problem` is the fixture this faculty member authored.
    assert stats["problems_published"] == 1
    assert stats["reviews_completed"] == 1


def test_a_faculty_portfolio_is_not_a_student_portfolio(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The mentoring counters exist for a mentor and are absent for a student."""
    student_stats = portfolio(client, student)["stats"]
    faculty_stats = portfolio(client, faculty)["stats"]

    assert student_stats["problems_published"] is None
    assert student_stats["reviews_completed"] is None
    assert faculty_stats["problems_published"] == 1
    assert faculty_stats["reviews_completed"] == 0


def test_another_mentors_work_is_not_counted(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    other_faculty = make_user(
        db, institution=institution_a, email="rohit.desai@crce.edu", role=UserRole.FACULTY
    )
    make_project(db, problem=problem, mentor=faculty, student=student)

    page = portfolio(client, other_faculty)

    assert page["projects"] == []
    assert page["stats"]["problems_published"] == 0


# --- tenancy ------------------------------------------------------------------------


def test_a_portfolio_never_reaches_another_institution(
    client: TestClient, db: Session, institution_b, faculty
) -> None:
    """Same person, same name, another college — none of it crosses over."""
    outsider = make_user(
        db, institution=institution_b, email="neha.kulkarni@other.edu", role=UserRole.FACULTY
    )
    outside_problem = make_problem(db, institution=institution_b, author=outsider)
    make_project(db, problem=outside_problem, mentor=outsider, published=True)
    credit(db, outsider, 700)

    page = portfolio(client, faculty)

    assert page["projects"] == []
    assert page["total_credits"] == 0
    assert page["stats"] == {
        "projects_completed": 0,
        "verified_solutions": 0,
        "problems_published": 0,
        "reviews_completed": 0,
    }


def test_each_institution_sees_only_its_own(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    outsider = make_user(db, institution=institution_b, email="tanvi.rao@other.edu")

    assert portfolio(client, student)["stats"]["verified_solutions"] == 1
    assert portfolio(client, outsider)["stats"]["verified_solutions"] == 0


# --- query cost ---------------------------------------------------------------------


def test_more_projects_do_not_mean_more_queries(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """The project read model is batched, so the page costs the same at any size."""
    headers = auth_header(client, student.email)
    make_project(db, problem=problem, mentor=faculty, student=student, title="One")

    with counting(db) as first:
        client.get("/api/v1/portfolio/me", headers=headers)

    for index in range(2, 5):
        extra = make_problem(db, institution=institution_a, author=faculty, title=f"P{index}")
        make_project(db, problem=extra, mentor=faculty, student=student, title=f"No {index}")

    with counting(db) as fourth:
        page = client.get("/api/v1/portfolio/me", headers=headers)

    assert len(page.json()["data"]["projects"]) == 4
    assert len(fourth) == len(first)
