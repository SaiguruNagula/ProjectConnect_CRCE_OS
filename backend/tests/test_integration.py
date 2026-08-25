"""The modules as one product.

Every other test file proves a module correct on its own. This one proves the
modules agree: that the number the Credit Engine wrote is the number the
leaderboard ranks, the portfolio counts and the Solutions Hub shows, and that
one lifecycle — not five — carries a project from a problem to a live
deployment.

Nothing here introduces a fact. Each assertion reads a canonical source and the
surfaces that compose it, and fails if they have drifted apart. Cases already
proved inside a single module are not repeated; what is new here is the seam
between modules.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, SubmissionStatus, UserRole
from app.modules.credits import config
from app.modules.credits.models import CreditTransaction
from app.modules.problems.models import Problem
from app.modules.projects import service as projects
from app.modules.projects.models import Project, StageSubmission
from app.modules.reviews import service as reviews
from app.modules.reviews.schemas import ReviewDecisionIn
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import TOTAL, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_faculty_credits import MENTOR_SHARE
from tests.test_leaderboard import credit
from tests.test_portfolio import counting, make_project
from tests.test_problems import VALID_PROBLEM
from tests.test_reviews import EVALUATION, audit_actions, decide, pending_idea, selected_project
from tests.test_solutions import LIVE_URL, STORED_URL, hub, stats, submit_final

# The Phase 5A rule table, bound under its fixture name so pytest resolves it here.
seeded_rules = _seeded_rules

# What the seeded rules pay a mentor for one project carried end to end: the
# problem they published, three stage reviews, and half of the award that
# completed it.
MENTOR_TOTAL = 10 + 80 * 3 + MENTOR_SHARE


def approved_deployment(client: TestClient, student, faculty, problem) -> str:
    """A project reviewed to final approval with a real deployment attached.

    Credit-eligible and unpublished — the two things the award and publication
    each decide for themselves.
    """
    project_id = selected_project(client, student, faculty, problem)
    assert submit_final(client, student, project_id, live_url=LIVE_URL).status_code == 200
    decision = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )
    assert decision.status_code == 200, decision.text
    return project_id


def summary(client: TestClient, viewer) -> dict:
    response = client.get("/api/v1/credits/summary", headers=auth_header(client, viewer.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def portfolio(client: TestClient, viewer) -> dict:
    response = client.get("/api/v1/portfolio/me", headers=auth_header(client, viewer.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def board(client: TestClient, viewer, role: str = "students") -> list[dict]:
    response = client.get(f"/api/v1/leaderboard/{role}", headers=auth_header(client, viewer.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def entry_for(rows: list[dict], user) -> dict | None:
    return next((row for row in rows if row["id"] == str(user.id)), None)


def journey(client: TestClient, viewer, project_id: str) -> dict:
    response = client.get(
        f"/api/v1/projects/{project_id}/journey", headers=auth_header(client, viewer.email)
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def queries(statements: list[str]) -> list[str]:
    """The statements the endpoint issued, without the test transaction's own.

    `counting` records everything the connection emits, and the savepoints
    pytest's nested transaction opens between fixtures land in the same list.
    """
    return [row for row in statements if row.split(None, 1)[0].upper() != "SAVEPOINT"]


def problem_card(client: TestClient, viewer, problem) -> dict:
    response = client.get(
        f"/api/v1/problems/{problem.id}", headers=auth_header(client, viewer.email)
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


# --- FLOW A: a student project, from problem to leaderboard ---------------------------


def test_an_approved_project_is_finished_on_no_surface(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """UD-1, read from the outside: approval makes a project eligible, not done.

    If any surface counted an unscored project as achievement, the review
    engine would own completion as well as the Credit Engine.
    """
    project_id = approved_deployment(client, student, faculty, problem)

    state = journey(client, student, project_id)
    assert state["status"] == "approved"
    assert state["credits"] is None
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None

    card = portfolio(client, student)
    assert card["projects"] == []
    assert card["stats"]["projects_completed"] == 0
    assert summary(client, student)["total"] == 0
    # The board is the ledger, and the ledger has nothing to say about them yet.
    assert entry_for(board(client, student), student) is None
    assert hub(client, student) == []


def test_one_award_completes_the_project_on_every_surface_at_once(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The Credit Engine writes once; five surfaces read that one write."""
    project_id = approved_deployment(client, student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200

    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None
    state = journey(client, student, project_id)
    assert state["status"] == "completed"
    assert state["credits"]["total"] == TOTAL

    balance = summary(client, student)
    assert balance["total"] == TOTAL
    assert balance["level_name"] == config.level_of(TOTAL)[1]

    card = portfolio(client, student)
    assert card["total_credits"] == balance["total"]
    assert card["level_name"] == balance["level_name"]
    assert card["stats"]["projects_completed"] == 1
    assert [entry["id"] for entry in card["projects"]] == [project_id]

    ranked = entry_for(board(client, student), student)
    assert ranked["credits"] == balance["total"]
    assert ranked["badge"] == balance["level_name"]
    assert ranked["contributions"] == 1

    # Completed is still not published: the hub waits for the mentor's verb.
    assert hub(client, student) == []
    assert publish(client, faculty, project_id).status_code == 200

    solution = hub(client, student)[0]
    assert solution["project_id"] == project_id
    assert solution["url"] == STORED_URL
    assert solution["credits"] == TOTAL
    assert solution["problem_id"] == str(problem.id)


# --- FLOW B: the mentor, paid by the same engine ---------------------------------------


def test_a_mentor_earns_from_the_one_ledger_students_earn_from(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    """Faculty credit is rule-priced, lands in the same ledger, ranks on its own board.

    The problem is created through the API rather than seeded so the whole
    mentor economy — publishing, reviewing, mentoring to completion — is
    exercised the way the product runs it.
    """
    created = client.post(
        "/api/v1/problems", json=VALID_PROBLEM, headers=auth_header(client, faculty.email)
    )
    assert created.status_code == 201, created.text
    problem = db.get(Problem, uuid.UUID(created.json()["data"]["id"]))

    project_id = approved_deployment(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    balance = summary(client, faculty)
    assert balance["total"] == MENTOR_TOTAL
    assert balance["lifetime"] == MENTOR_TOTAL
    # A mentor has no pipeline: their credits come from rules, not submissions.
    assert balance["pending"] == 0

    ranked = entry_for(board(client, faculty, "faculty"), faculty)
    assert ranked["credits"] == balance["total"]
    assert ranked["badge"] == balance["level_name"]
    assert ranked["contributions"] == 1
    assert ranked["role"] == UserRole.FACULTY.value

    # Boards are per role: neither person appears on the other's.
    assert entry_for(board(client, faculty, "faculty"), student) is None
    assert entry_for(board(client, student), faculty) is None

    card = portfolio(client, faculty)
    assert card["total_credits"] == balance["total"]
    assert card["stats"] == {
        "projects_completed": 1,
        "verified_solutions": 0,
        "problems_published": 1,
        "reviews_completed": 3,
    }
    # The evidence differs by role: a student is never asked these two questions.
    assert portfolio(client, student)["stats"]["problems_published"] is None


# --- FLOW C: the deployed project -------------------------------------------------------


def test_publication_moves_a_solution_in_and_out_of_every_view_of_it(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """`projects.published` is the whole of the hub, and it works both ways."""
    project_id = approved_deployment(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    assert publish(client, faculty, project_id).status_code == 200
    assert [entry["project_id"] for entry in hub(client, student)] == [project_id]
    assert portfolio(client, student)["stats"]["verified_solutions"] == 1
    assert problem_card(client, student, problem)["solutions_count"] == 1
    assert stats(client, student)["live_solutions"] == 1

    assert publish(client, faculty, project_id, publish=False).status_code == 200
    assert hub(client, student) == []
    assert portfolio(client, student)["stats"]["verified_solutions"] == 0
    assert problem_card(client, student, problem)["solutions_count"] == 0
    assert stats(client, student)["live_solutions"] == 0
    # Taking a solution down does not un-complete it or refund anybody.
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None
    assert summary(client, student)["total"] == TOTAL

    assert publish(client, faculty, project_id).status_code == 200
    assert hub(client, student)[0]["url"] == STORED_URL

    actions = audit_actions(db)
    assert actions.count("project.published") == 2
    assert actions.count("project.unpublished") == 1


# --- FLOW D: the institution boundary ----------------------------------------------------


def test_no_surface_crosses_the_institution_boundary(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    """Both directions: A cannot reach B's work, and B's views hold only B's."""
    project_id = approved_deployment(client, student, faculty, problem)
    assert publish(client, faculty, project_id).status_code == 200

    outsider = make_user(db, institution=institution_b, email="rhea.mehta@other.edu")
    outside_faculty = make_user(
        db, institution=institution_b, email="vikram.rao@other.edu", role=UserRole.FACULTY
    )
    outside_problem = make_problem(
        db, institution=institution_b, author=outside_faculty, title="Their problem"
    )
    make_project(
        db,
        problem=outside_problem,
        mentor=outside_faculty,
        student=outsider,
        published=True,
        title="Their solution",
    )
    credit(db, outsider, 900)

    headers = auth_header(client, outsider.email)
    assert client.get(f"/api/v1/problems/{problem.id}", headers=headers).status_code == 404
    assert client.get(f"/api/v1/projects/{project_id}", headers=headers).status_code == 404
    assert client.get(f"/api/v1/projects/{project_id}/journey", headers=headers).status_code == 404
    foreign_review = client.get(
        f"/api/v1/reviews/{project_id}", headers=auth_header(client, outside_faculty.email)
    )
    assert foreign_review.status_code == 404

    # Each side's hub and board hold their own work and only their own.
    assert [entry["name"] for entry in hub(client, outsider)] == ["Their solution"]
    assert [entry["project_id"] for entry in hub(client, student)] == [project_id]
    assert [row["id"] for row in board(client, outsider)] == [str(outsider.id)]
    assert entry_for(board(client, student), outsider) is None


def test_scope_is_never_read_from_the_query_string(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    """A caller may ask for another tenant, another user or another score. The
    server reads none of it: every response below is the token's own scope."""
    project_id = approved_deployment(client, student, faculty, problem)
    assert publish(client, faculty, project_id).status_code == 200
    credit(db, student, 40)

    hostile = {
        "institution_id": str(institution_b.id),
        "college_id": str(institution_b.id),
        "user_id": str(faculty.id),
        "role": "faculty",
        "credits": 9999,
        "points": 9999,
        "project_id": str(uuid.uuid4()),
    }
    headers = auth_header(client, student.email)

    for path in (
        "/api/v1/credits/summary",
        "/api/v1/portfolio/me",
        "/api/v1/leaderboard/students",
        "/api/v1/leaderboard/faculty",
        "/api/v1/solutions",
        "/api/v1/solutions/stats",
    ):
        clean = client.get(path, headers=headers)
        dirty = client.get(path, params=hostile, headers=headers)
        assert dirty.status_code == 200, dirty.text
        assert clean.json()["data"] == dirty.json()["data"], path

    assert summary(client, student)["total"] == 40
    assert portfolio(client, student)["user_id"] == str(student.id)


# --- FLOW E: failure leaves nothing behind -------------------------------------------------


def test_a_review_that_cannot_pay_the_reviewer_is_not_a_review(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules, monkeypatch
) -> None:
    """Reviewing pays the reviewer inside the verdict's own transaction, so a
    credit that cannot be written has to take the verdict down with it."""
    project_id = pending_idea(client, student, problem)

    def flaky(session, *args, **kwargs):
        raise RuntimeError("credit engine unavailable")

    monkeypatch.setattr(reviews.credits, "earn", flaky)

    with pytest.raises(RuntimeError):
        reviews.decide(
            db,
            faculty,
            uuid.UUID(project_id),
            SubmissionStage.IDEA,
            ReviewDecisionIn(decision="approve"),
        )
    db.rollback()

    row = (
        db.query(StageSubmission)
        .filter_by(project_id=uuid.UUID(project_id), stage=SubmissionStage.IDEA)
        .one()
    )
    assert row.status is SubmissionStatus.SUBMITTED
    assert row.reviewed_at is None
    assert row.reviewed_by is None
    assert db.query(CreditTransaction).count() == 0
    assert "review.stage_approved" not in audit_actions(db)


def test_a_publication_that_fails_halfway_reaches_no_shelf(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules, monkeypatch
) -> None:
    """The flag and its audit row share one transaction."""
    project_id = approved_deployment(client, student, faculty, problem)

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(projects, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        projects.set_publication(db, faculty, uuid.UUID(project_id), True)
    db.rollback()

    assert db.get(Project, uuid.UUID(project_id)).published is False
    assert hub(client, student) == []
    assert "project.published" not in audit_actions(db)


# --- query cost -----------------------------------------------------------------------------


def test_the_collection_endpoints_do_not_grow_queries_with_rows(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """The four largest lists in the product are batched, not looped.

    One measurement at one row, another at four; the counts must match. Rows go
    in directly so what is measured is the endpoint, not the fixtures.
    """
    pending_idea(client, student, problem)
    student_headers = auth_header(client, student.email)
    faculty_headers = auth_header(client, faculty.email)
    paths = (
        ("/api/v1/problems", student_headers),
        ("/api/v1/projects", student_headers),
        ("/api/v1/reviews/queues", faculty_headers),
        ("/api/v1/leaderboard/students", student_headers),
    )

    baseline = {}
    for path, headers in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200
        baseline[path] = len(queries(statements))

    for index in range(2, 5):
        extra = make_problem(
            db, institution=institution_a, author=faculty, title=f"Problem {index}"
        )
        peer = make_user(db, institution=institution_a, email=f"peer{index}@crce.edu")
        project = make_project(
            db, problem=extra, mentor=faculty, student=student, title=f"Project {index}"
        )
        db.add(
            StageSubmission(
                project_id=project.id,
                stage=SubmissionStage.IDEA,
                status=SubmissionStatus.SUBMITTED,
                submitted_at=datetime.now(UTC),
            )
        )
        credit(db, peer, 100 * index)
    db.flush()

    for path, headers in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200
        assert len(queries(statements)) == baseline[path], path
