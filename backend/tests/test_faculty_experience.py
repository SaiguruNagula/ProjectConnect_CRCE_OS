"""The product from a faculty member's seat.

`test_student_experience` walks the journey a student takes. This file walks
the other side of the same journey — publish a problem, watch it become work,
review each stage, select the team, complete it with an award, publish the
result — and then walks the far larger set of things a mentor must not be able
to do from that same seat.

Nothing here is a new capability. Every request below goes to an endpoint an
earlier phase already shipped, and every number a faculty page shows is read
back from the module that owns it: the ledger for credits, `credit_rules` for
what an event pays, `stage_submissions.reviewed_by` for reviews, `completed_at`
for finished work, `projects.published` for the hub. If a test in this file
needed a faculty-only score, a second review engine or a dashboard table, that
would be the bug it is looking for.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, SubmissionStatus, UserRole, UserStatus
from app.modules.credits import repository as credits_repo
from app.modules.credits.models import CreditAward, CreditTransaction
from app.modules.problems.models import Problem
from app.modules.projects import service as projects
from app.modules.projects.models import Project, StageSubmission
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import AWARD, TOTAL, approved_project, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_faculty_credits import (
    MENTOR_SHARE,
    MENTORSHIP,
    PUBLISHED,
    PUBLISHED_POINTS,
    REVIEW,
    REVIEW_POINTS,
    create_problem,
    share_of,
    sources,
)
from tests.test_integration import queries
from tests.test_leaderboard import credit
from tests.test_portfolio import counting, make_project
from tests.test_projects import FINAL, POC, open_project
from tests.test_reviews import EVALUATION, FEEDBACK, decide, pending_idea, submit
from tests.test_solutions import LIVE_URL, STORED_URL

# The Phase 5A rule table, bound under its fixture name so pytest resolves it here.
seeded_rules = _seeded_rules

# Every read the faculty workspace makes. Kept as one list because most of what
# this file checks is that the whole set behaves alike — all authenticated, all
# institution-scoped, all closed the moment the account is.
FACULTY_READS = (
    "/api/v1/auth/me",
    "/api/v1/institutions/me",
    "/api/v1/problems",
    "/api/v1/problems/drafts",
    "/api/v1/problem-suggestions",
    "/api/v1/projects",
    "/api/v1/reviews/queues",
    "/api/v1/credits/summary",
    "/api/v1/credits/history",
    "/api/v1/credits/categories",
    "/api/v1/credits/rules",
    "/api/v1/leaderboard/faculty",
    "/api/v1/portfolio/me",
    "/api/v1/solutions",
    "/api/v1/faculty/me/profile",
)

# The subset the role gate closes to a student. The rest of `FACULTY_READS` is
# shared by design — one ledger, one hub, one board (ADR-5).
FACULTY_ONLY_READS = (
    "/api/v1/problems/drafts",
    "/api/v1/reviews/queues",
    "/api/v1/faculty/me/profile",
)

# Faculty surfaces the frozen frontend composes client-side, or that would need
# a scoring system this product does not have. None of them is a route, and
# this file exists partly to keep it that way (BACKEND_ARCHITECTURE.md §22,
# ADR-5).
ABSENT_FACULTY_ROUTES = (
    "/api/v1/faculty/dashboard",
    "/api/v1/faculty/stats",
    "/api/v1/faculty/activity",
    "/api/v1/faculty/analytics",
    "/api/v1/faculty/me/reputation",
)


def get(client: TestClient, viewer, path: str, **params) -> dict | list:
    response = client.get(path, params=params, headers=auth_header(client, viewer.email))
    assert response.status_code == 200, f"{path}: {response.text}"
    return response.json()["data"]


def published_problem(client: TestClient, db: Session, faculty, **overrides) -> Problem:
    """A problem authored through the API, so its publication event really fired."""
    response = create_problem(client, faculty, **overrides)
    assert response.status_code == 201, response.text
    return db.get(Problem, uuid.UUID(response.json()["data"]["id"]))


def rank_of(client: TestClient, viewer) -> dict | None:
    board = get(client, viewer, "/api/v1/leaderboard/faculty")
    return next((row for row in board if row["id"] == str(viewer.id)), None)


def queue_ids(client: TestClient, faculty) -> dict[str, list[str]]:
    queues = get(client, faculty, "/api/v1/reviews/queues")
    return {name: [item["id"] for item in items] for name, items in queues.items()}


def colleague(db: Session, institution) -> object:
    return make_user(
        db, institution=institution, email="ravi.desai@crce.edu", role=UserRole.FACULTY
    )


# --- the journey ---------------------------------------------------------------------


def test_a_mentor_carries_a_problem_from_publication_to_a_published_solution(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    """The whole faculty experience in one pass.

    Every state change goes through the module that owns it — the review engine
    decides, the Credit Engine completes, `set_publication` publishes — and
    every number is read back from the surface the frozen frontend reads it
    from. The mentor's own verbs are four: publish a problem, decide a stage,
    award, publish the result.
    """
    # 1. Publishing the problem is the first credited faculty event, and the
    # rule table prices it — not the reward the problem carries.
    problem = published_problem(client, db, faculty, base_credits=300)
    assert get(client, faculty, "/api/v1/credits/summary")["total"] == PUBLISHED_POINTS
    assert [row["id"] for row in get(client, faculty, "/api/v1/problems")["items"]] == [
        str(problem.id)
    ]

    # 2. A student applies. The problem's author mentors whatever it produces
    # (ADR-3), so the project arrives in this faculty member's space unasked.
    project_id = open_project(client, student, problem)
    mine = get(client, faculty, "/api/v1/projects")
    assert [row["id"] for row in mine] == [project_id]
    assert queue_ids(client, faculty) == {"idea": [], "poc": [], "final": [], "completed": []}

    # 3. Stage 1. Submitting is what puts it in the queue; opening it is a read.
    submit(client, student, project_id, SubmissionStage.IDEA)
    assert queue_ids(client, faculty)["idea"] == [project_id]
    opened = get(client, faculty, f"/api/v1/reviews/{project_id}")
    assert opened["idea"]["status"] == SubmissionStatus.SUBMITTED.value
    assert decide(client, faculty, project_id, SubmissionStage.IDEA, "approve").status_code == 200

    # 4. Stage 2, and the selection the review engine settles with it.
    submit(client, student, project_id, SubmissionStage.POC)
    assert queue_ids(client, faculty)["poc"] == [project_id]
    selected = decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    assert selected.status_code == 200, selected.text
    assert selected.json()["data"]["selection"]["decided_by"] == faculty.name

    # 5. Stage 3. Approving scores the work and makes it credit-eligible.
    deployed = client.put(
        f"/api/v1/projects/{project_id}/final?submit=true",
        json=FINAL | {"live_url": LIVE_URL},
        headers=auth_header(client, student.email),
    )
    assert deployed.status_code == 200, deployed.text
    approved = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )
    assert approved.status_code == 200, approved.text

    # Three stages reviewed, three review credits — and no mentorship credit
    # yet, because approving is not completing (UD-1).
    assert sources(db, faculty) == [(PUBLISHED, PUBLISHED_POINTS)] + [(REVIEW, REVIEW_POINTS)] * 3
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None

    # 6. The award completes the project, credits the team, and pays the mentor
    # what the rule says mentorship is worth — never what they just typed.
    assert award(client, faculty, project_id).status_code == 200
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None
    assert get(client, student, "/api/v1/credits/summary")["total"] == TOTAL

    earned = PUBLISHED_POINTS + REVIEW_POINTS * 3 + MENTOR_SHARE
    summary = get(client, faculty, "/api/v1/credits/summary")
    assert summary["total"] == earned

    # 7. Every faculty surface reports that one number, from the one ledger.
    card = get(client, faculty, "/api/v1/portfolio/me")
    ranked = rank_of(client, faculty)
    assert card["total_credits"] == ranked["credits"] == earned
    assert card["level_name"] == summary["level_name"] == ranked["badge"]
    assert card["stats"] == {
        "projects_completed": 1,
        "verified_solutions": 0,
        "problems_published": 1,
        "reviews_completed": 3,
    }
    assert [row["id"] for row in card["projects"]] == [project_id]
    assert ranked["contributions"] == 1

    # 8. Publication is the mentor's last verb, and the hub is a read of it.
    assert get(client, faculty, "/api/v1/solutions") == []
    assert publish(client, faculty, project_id).status_code == 200
    solution = get(client, faculty, "/api/v1/solutions")[0]
    assert solution["project_id"] == project_id
    assert solution["mentor_name"] == faculty.name
    assert solution["url"] == STORED_URL
    assert solution["credits"] == TOTAL

    # Publishing moved nothing an engine owns.
    assert get(client, faculty, "/api/v1/credits/summary") == summary
    assert get(client, faculty, "/api/v1/portfolio/me")["stats"]["verified_solutions"] == 1

    # 9. And the profile held none of it, before or after.
    profile = get(client, faculty, "/api/v1/faculty/me/profile")
    assert profile["user_id"] == str(faculty.id)
    assert set(profile) & {"total_credits", "rank", "badge", "reviews", "reputation"} == set()


def test_the_faculty_dashboard_composes_from_endpoints_that_already_exist(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """FacultyDashboard reads queues, problems, projects and drafts — four
    endpoints Phases 3-4 shipped. No fifth aggregate exists, because an
    aggregate could disagree with the four surfaces it summarises.
    """
    pending_idea(client, student, problem)
    saved = client.post(
        "/api/v1/problems/drafts",
        json={
            "title": "Lab equipment tracker",
            "department": "Mechanical",
            "summary": "Nobody knows which lathe is free.",
            "statement": "Booking happens on a whiteboard that is never current.",
            "difficulty": "Beginner",
            "skills": ["React"],
            "team_size": 2,
            "registration_date": problem.start_date.isoformat(),
            "deadline_date": problem.end_date.isoformat(),
            "base_credits": 100,
        },
        headers=auth_header(client, faculty.email),
    )
    assert saved.status_code == 201, saved.text

    queues = get(client, faculty, "/api/v1/reviews/queues")
    assert len(queues["idea"] + queues["poc"] + queues["final"]) == 1
    assert len(get(client, faculty, "/api/v1/problems")["items"]) == 1
    assert len(get(client, faculty, "/api/v1/projects")) == 1
    assert len(get(client, faculty, "/api/v1/problems/drafts")) == 1

    for path in ABSENT_FACULTY_ROUTES:
        assert client.get(path, headers=auth_header(client, faculty.email)).status_code == 404


# --- authorization ---------------------------------------------------------------------


def test_an_anonymous_caller_reaches_no_faculty_surface(client: TestClient) -> None:
    for path in FACULTY_READS:
        response = client.get(path)
        assert response.status_code == 401, path
        assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_a_student_cannot_stand_in_the_faculty_seat(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The role gate refuses before any body is read, so there is no payload a
    student can send that reaches the review engine or the Credit Engine."""
    project_id = pending_idea(client, student, problem)
    headers = auth_header(client, student.email)

    for path in FACULTY_ONLY_READS:
        response = client.get(path, headers=headers)
        assert response.status_code == 403, path
        assert response.json()["error_code"] == "FORBIDDEN"

    for method, path, body in (
        ("get", f"/api/v1/reviews/{project_id}", None),
        ("post", f"/api/v1/reviews/{project_id}/idea", {"decision": "approve"}),
        ("post", f"/api/v1/projects/{project_id}/credits", AWARD),
        ("post", f"/api/v1/projects/{project_id}/publication", {"publish": True}),
        ("post", "/api/v1/problems", {"title": "Mine now"}),
    ):
        response = client.request(method, path, json=body, headers=headers)
        assert response.status_code == 403, path

    # Denied at the gate means denied everywhere downstream: no ledger line, no
    # verdict, no completion.
    assert sources(db, student) == []
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None


def test_a_colleague_who_is_not_the_nominated_mentor_decides_nothing(
    client: TestClient, db: Session, institution_a, student, faculty, problem, seeded_rules
) -> None:
    """ADR-3: the problem's author mentors its projects, and only they review.

    A second faculty member of the same institution is a peer, not a reviewer:
    the project exists for them (403, not 404), but every verb on it is denied
    and their own queue never mentions it.
    """
    project_id = approved_project(client, student, faculty, problem)
    peer = colleague(db, institution_a)
    headers = auth_header(client, peer.email)

    for method, path, body in (
        ("get", f"/api/v1/reviews/{project_id}", None),
        ("post", f"/api/v1/reviews/{project_id}/final", {"decision": "approve"}),
        ("post", f"/api/v1/projects/{project_id}/credits", AWARD),
        ("post", f"/api/v1/projects/{project_id}/publication", {"publish": True}),
        ("get", f"/api/v1/projects/{project_id}", None),
        ("get", f"/api/v1/projects/{project_id}/journey", None),
    ):
        response = client.request(method, path, json=body, headers=headers)
        assert response.status_code == 403, path
        assert response.json()["error_code"] == "FORBIDDEN"

    assert queue_ids(client, peer) == {"idea": [], "poc": [], "final": [], "completed": []}
    assert get(client, peer, "/api/v1/projects") == []
    assert sources(db, peer) == []
    assert get(client, peer, "/api/v1/portfolio/me")["stats"]["reviews_completed"] == 0


def test_a_mentor_cannot_review_as_somebody_else(
    client: TestClient, db: Session, institution_a, student, faculty, problem, seeded_rules
) -> None:
    """`reviewed_by` comes from the token. There is no field to override it."""
    project_id = pending_idea(client, student, problem)
    peer = colleague(db, institution_a)

    forged = client.post(
        f"/api/v1/reviews/{project_id}/idea",
        json={"decision": "approve", "reviewed_by": str(peer.id), "faculty_id": str(peer.id)},
        headers=auth_header(client, faculty.email),
    )
    assert forged.status_code == 422
    assert forged.json()["error_code"] == "VALIDATION_ERROR"

    honest = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    assert honest.status_code == 200, honest.text

    row = (
        db.query(StageSubmission)
        .filter_by(project_id=uuid.UUID(project_id), stage=SubmissionStage.IDEA)
        .one()
    )
    assert row.reviewed_by == faculty.id
    assert sources(db, peer) == []
    assert sources(db, faculty) == [(REVIEW, REVIEW_POINTS)]


def test_a_mentor_cannot_write_a_fact_a_student_owns(
    client: TestClient, student, faculty, problem
) -> None:
    """Reviewing is not authoring: the stage payload, the team and the student
    profile are all closed to faculty at the role gate."""
    project_id = open_project(client, student, problem)
    headers = auth_header(client, faculty.email)

    for method, path, body in (
        ("put", f"/api/v1/projects/{project_id}/idea", POC),
        ("put", f"/api/v1/projects/{project_id}/proof-of-concept", POC),
        ("post", f"/api/v1/problems/{problem.id}/applications", {"idea_summary": "Mine"}),
        ("post", "/api/v1/teams", {"name": "Faculty team", "problem_id": str(problem.id)}),
        ("patch", "/api/v1/students/me/profile", {"headline": "Not mine"}),
    ):
        response = client.request(method, path, json=body, headers=headers)
        assert response.status_code == 403, path


@pytest.mark.parametrize("closure", ["suspended", "deleted"])
def test_closing_an_account_closes_the_whole_faculty_surface_mid_session(
    client: TestClient, db: Session, faculty, problem, closure: str
) -> None:
    """A live token is not a standing permission: every request re-reads the row."""
    headers = auth_header(client, faculty.email)
    assert client.get("/api/v1/reviews/queues", headers=headers).status_code == 200

    if closure == "suspended":
        faculty.status = UserStatus.SUSPENDED
    else:
        faculty.deleted_at = datetime.now(UTC)
    db.flush()

    for path in FACULTY_READS:
        response = client.get(path, headers=headers)
        assert response.status_code == 401, path
        assert response.json()["error_code"] == "UNAUTHENTICATED"


# --- the institution boundary ------------------------------------------------------------


def test_no_faculty_surface_crosses_the_institution_boundary(
    client: TestClient, db: Session, institution_b, student, faculty, problem, seeded_rules
) -> None:
    """Another college's project does not exist — 404, never 403, so a stranger
    cannot learn that it is real."""
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    assert publish(client, faculty, project_id).status_code == 200

    outsider = make_user(
        db, institution=institution_b, email="anita.rao@other.edu", role=UserRole.FACULTY
    )
    headers = auth_header(client, outsider.email)

    for method, path, body in (
        ("get", f"/api/v1/problems/{problem.id}", None),
        ("get", f"/api/v1/projects/{project_id}", None),
        ("get", f"/api/v1/reviews/{project_id}", None),
        ("post", f"/api/v1/reviews/{project_id}/final", {"decision": "approve"}),
        ("post", f"/api/v1/projects/{project_id}/credits", AWARD),
        ("post", f"/api/v1/projects/{project_id}/publication", {"publish": False}),
        ("get", f"/api/v1/institutions/{problem.institution_id}", None),
    ):
        response = client.request(method, path, json=body, headers=headers)
        assert response.status_code == 404, path

    assert get(client, outsider, "/api/v1/problems")["items"] == []
    assert get(client, outsider, "/api/v1/projects") == []
    assert get(client, outsider, "/api/v1/solutions") == []
    assert get(client, outsider, "/api/v1/leaderboard/faculty") == []
    assert queue_ids(client, outsider)["completed"] == []
    assert get(client, outsider, "/api/v1/portfolio/me")["total_credits"] == 0

    # And the project stayed exactly as its own mentor left it.
    row = db.get(Project, uuid.UUID(project_id))
    assert row.published is True
    assert row.completed_at is not None


def test_a_mentor_cannot_widen_their_own_scope_through_the_query_string(
    client: TestClient, db: Session, institution_b, student, faculty, problem, seeded_rules
) -> None:
    """Institution, identity and score are all derived. None is an input."""
    peer = make_user(
        db, institution=institution_b, email="vikram.iyer@other.edu", role=UserRole.FACULTY
    )
    credit(db, peer, 5000)
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    hostile = {
        "institution_id": str(institution_b.id),
        "college_id": str(institution_b.id),
        "user_id": str(peer.id),
        "faculty_id": str(peer.id),
        "project_id": project_id,
        "role": "admin",
        "credits": 9999,
        "points": 9999,
    }
    headers = auth_header(client, faculty.email)

    for path in FACULTY_READS:
        clean = client.get(path, headers=headers)
        dirty = client.get(path, params=hostile, headers=headers)
        assert dirty.status_code == 200, f"{path}: {dirty.text}"
        assert clean.json()["data"] == dirty.json()["data"], path

    assert rank_of(client, faculty)["credits"] == REVIEW_POINTS * 3 + MENTOR_SHARE


# --- the Credit Engine owns every faculty number ------------------------------------------


def test_a_mentors_credits_are_the_same_number_on_every_surface(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    """Summary, history, categories, portfolio and board are five readings of
    one ledger. Nothing recomputes, and no surface holds a copy."""
    problem = published_problem(client, db, faculty)
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    earned = PUBLISHED_POINTS + REVIEW_POINTS * 3 + MENTOR_SHARE
    summary = get(client, faculty, "/api/v1/credits/summary")
    history = get(client, faculty, "/api/v1/credits/history")
    categories = get(client, faculty, "/api/v1/credits/categories")
    card = get(client, faculty, "/api/v1/portfolio/me")
    ranked = rank_of(client, faculty)

    assert summary["total"] == earned
    assert sum(row["points"] for row in history) == earned
    assert sum(row["value"] for row in categories) == earned
    assert card["total_credits"] == earned
    assert ranked["credits"] == earned
    assert credits_repo.balance(db, faculty.id) == earned

    assert card["level_name"] == summary["level_name"] == ranked["badge"]
    assert {row["source"] for row in history} == {PUBLISHED, REVIEW, MENTORSHIP}
    # A mentor earns from rules, not from submissions — the pipeline is a
    # student's forecast and stays empty here.
    assert get(client, faculty, "/api/v1/credits/pipeline") == []


def test_no_faculty_event_pays_twice_however_often_the_journey_is_replayed(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    """Idempotency across the whole journey, not one event at a time.

    Re-reviewing a resubmitted stage, revising an award, and publishing,
    unpublishing and republishing are all repeat traffic over settled events.
    None of them may move the ledger.
    """
    problem = published_problem(client, db, faculty)
    project_id = pending_idea(client, student, problem)

    # A stage reviewed twice is one piece of work.
    decide(client, faculty, project_id, SubmissionStage.IDEA, "changes", **FEEDBACK)
    submit(client, student, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    submit(client, student, project_id, SubmissionStage.FINAL)
    assert (
        decide(
            client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
        ).status_code
        == 200
    )

    assert award(client, faculty, project_id).status_code == 200
    revised = award(client, faculty, project_id, bonus=AWARD["bonus"] + 20)
    assert revised.status_code == 200, revised.text

    for wanted in (True, False, True):
        assert publish(client, faculty, project_id, wanted).status_code == 200

    # The revision is the one thing here that is not repeat traffic: it re-scores
    # the project, so the mentor's share is topped up by the difference — half of
    # the 20 credits added — and never paid a second time in full.
    expected = (
        [(PUBLISHED, PUBLISHED_POINTS)]
        + [(REVIEW, REVIEW_POINTS)] * 3
        + [(MENTORSHIP, MENTOR_SHARE), (MENTORSHIP, share_of(TOTAL + 20) - MENTOR_SHARE)]
    )
    assert sorted(sources(db, faculty)) == sorted(expected)
    assert get(client, faculty, "/api/v1/credits/summary")["total"] == sum(
        points for _, points in expected
    )


def test_without_a_rule_the_journey_still_runs_and_credits_nobody(
    client: TestClient, db: Session, student, faculty
) -> None:
    """An event the institution has not priced is free, never an error — and an
    uncredited mentor is not on the board at all."""
    problem = published_problem(client, db, faculty)
    project_id = approved_project(client, student, faculty, problem)

    assert sources(db, faculty) == []
    assert get(client, faculty, "/api/v1/credits/summary")["total"] == 0
    assert rank_of(client, faculty) is None
    assert get(client, faculty, "/api/v1/portfolio/me")["total_credits"] == 0
    # The lifecycle is unaffected: the award still completes the project.
    assert award(client, faculty, project_id).status_code == 200
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None


def test_a_deactivated_rule_stops_paying_the_mentor_without_stopping_the_work(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    for rule in seeded_rules:
        if rule.event_type in ("REVIEW_COMPLETED", "MENTOR_AWARD_SHARE"):
            rule.active = False
    db.flush()

    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    assert sources(db, faculty) == []
    # The student's award comes from the mentor's five components, not a rule,
    # so it is untouched by the faculty rules being switched off.
    assert get(client, student, "/api/v1/credits/summary")["total"] == TOTAL


# --- the leaderboard reads the ledger and nothing else ------------------------------------


def test_the_faculty_board_ranks_by_the_ledger_alone(
    client: TestClient, db: Session, institution_a, student, faculty, problem, seeded_rules
) -> None:
    """Two mentors, one credited: reviews and mentorships move a rank only
    through the credits they earn, and a tie shares a place."""
    peer = colleague(db, institution_a)
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    board = get(client, faculty, "/api/v1/leaderboard/faculty")
    assert [row["id"] for row in board] == [str(faculty.id)]
    assert board[0]["role"] == UserRole.FACULTY.value
    assert board[0]["rank"] == 1
    assert board[0]["rank_change"] == 0
    assert board[0]["credits"] == get(client, faculty, "/api/v1/credits/summary")["total"]

    # A colleague with the same credits shares rank 1 — and mentoring nothing
    # does not cost them a place.
    credit(db, peer, board[0]["credits"])
    tied = get(client, faculty, "/api/v1/leaderboard/faculty")
    assert {row["rank"] for row in tied} == {1}
    assert {row["contributions"] for row in tied} == {1, 0}

    # A correction is a negative ledger line, and the board follows it down.
    credit(db, peer, -board[0]["credits"])
    corrected = get(client, faculty, "/api/v1/leaderboard/faculty")
    assert [(row["id"], row["credits"]) for row in corrected][0] == (
        str(faculty.id),
        board[0]["credits"],
    )
    assert next(row for row in corrected if row["id"] == str(peer.id))["credits"] == 0

    # Students are ranked on their own board; the two never mix.
    assert [row["id"] for row in get(client, faculty, "/api/v1/leaderboard/students")] == [
        str(student.id)
    ]


def test_a_deleted_mentor_leaves_the_board_without_touching_the_ledger(
    client: TestClient, db: Session, institution_a, student, faculty, problem, seeded_rules
) -> None:
    peer = colleague(db, institution_a)
    credit(db, peer, 500)
    assert len(get(client, faculty, "/api/v1/leaderboard/faculty")) == 1

    peer.deleted_at = datetime.now(UTC)
    db.flush()

    assert get(client, faculty, "/api/v1/leaderboard/faculty") == []
    assert credits_repo.balance(db, peer.id) == 500


# --- the portfolio composes, it does not count ---------------------------------------------


def test_a_faculty_portfolio_is_the_canonical_rows_counted_once(
    client: TestClient, db: Session, institution_a, student, faculty, seeded_rules
) -> None:
    """Each stat is a count of the table that owns the fact: `problems.created_by`,
    `stage_submissions.reviewed_by`, `projects.completed_at`, `projects.published`.
    Another mentor's work never lands in this total."""
    first = published_problem(client, db, faculty)
    published_problem(client, db, faculty, title="Campus water telemetry")
    project_id = approved_project(client, student, faculty, first)
    assert award(client, faculty, project_id).status_code == 200
    assert publish(client, faculty, project_id).status_code == 200

    # A colleague's problem, project and reviews — none of it is this mentor's.
    peer = colleague(db, institution_a)
    peer_problem = make_problem(
        db, institution=institution_a, author=peer, title="Hostel laundry queue"
    )
    make_project(db, problem=peer_problem, mentor=peer, student=student, published=True)

    card = get(client, faculty, "/api/v1/portfolio/me")
    assert card["stats"] == {
        "projects_completed": 1,
        "verified_solutions": 1,
        "problems_published": 2,
        "reviews_completed": 3,
    }
    assert [row["id"] for row in card["projects"]] == [project_id]
    assert card["role"] == UserRole.FACULTY.value
    assert card["user_id"] == str(faculty.id)
    assert card["total_credits"] == credits_repo.balance(db, faculty.id)

    assert db.query(Problem).filter_by(created_by=faculty.id).count() == 2
    assert (
        db.query(StageSubmission).filter_by(reviewed_by=faculty.id).count()
        == card["stats"]["reviews_completed"]
    )


def test_reading_the_faculty_surfaces_writes_nothing(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Opening a queue, a review or a portfolio is a read. None of them credits,
    completes, publishes or audits anything."""
    project_id = pending_idea(client, student, problem)
    before = db.query(CreditTransaction).count()

    for path in FACULTY_READS + (f"/api/v1/reviews/{project_id}",):
        assert client.get(path, headers=auth_header(client, faculty.email)).status_code == 200

    assert db.query(CreditTransaction).count() == before
    row = db.get(Project, uuid.UUID(project_id))
    assert row.completed_at is None
    assert row.published is False


# --- the profile owns identity and nothing else --------------------------------------------


def test_a_faculty_profile_edit_moves_nothing_an_engine_owns(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Name and department reach the board and the portfolio; the numbers do not
    move, and a server-owned field is a 422 rather than a silent no-op."""
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    before = get(client, faculty, "/api/v1/credits/summary")

    hostile = client.patch(
        "/api/v1/faculty/me/profile",
        json={
            "designation": "Professor",
            "total_credits": 9999,
            "rank": 1,
            "reviews_completed": 99,
            "role": "admin",
            "institution_id": str(uuid.uuid4()),
        },
        headers=auth_header(client, faculty.email),
    )
    assert hostile.status_code == 422
    assert hostile.json()["error_code"] == "VALIDATION_ERROR"

    saved = client.patch(
        "/api/v1/faculty/me/profile",
        json={"name": "Dr Neha Kulkarni", "department": "Computer Engineering"},
        headers=auth_header(client, faculty.email),
    )
    assert saved.status_code == 200, saved.text

    assert get(client, faculty, "/api/v1/credits/summary") == before
    ranked = rank_of(client, faculty)
    assert ranked["name"] == "Dr Neha Kulkarni"
    assert ranked["department"] == "Computer Engineering"
    assert ranked["credits"] == before["total"]
    card = get(client, faculty, "/api/v1/portfolio/me")
    assert card["name"] == "Dr Neha Kulkarni"
    assert card["department"] == "Computer Engineering"
    assert card["stats"]["reviews_completed"] == 3


# --- publication is a flag, and the hub is a read of it -------------------------------------


def test_only_the_nominated_mentor_publishes_and_only_an_approved_final(
    client: TestClient,
    db: Session,
    institution_a,
    student,
    other_student,
    faculty,
    problem,
    seeded_rules,
) -> None:
    project_id = pending_idea(client, student, problem)

    early = publish(client, faculty, project_id)
    assert early.status_code == 409
    assert early.json()["error_code"] == "BUSINESS_RULE_VIOLATION"

    # A second team on the same problem, so the approved case is a different project.
    approved = approved_project(client, other_student, faculty, problem)
    peer = colleague(db, institution_a)
    assert publish(client, peer, approved).status_code == 403
    assert db.get(Project, uuid.UUID(approved)).published is False


def test_publish_unpublish_and_republish_move_only_the_hub(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The Solutions Hub follows `projects.published` both ways, and nothing
    else follows with it: credits and `completed_at` are untouched throughout."""
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    completed_at = db.get(Project, uuid.UUID(project_id)).completed_at
    ledger = get(client, faculty, "/api/v1/credits/summary")
    student_ledger = get(client, student, "/api/v1/credits/summary")

    for wanted, expected in ((True, [project_id]), (False, []), (True, [project_id])):
        assert publish(client, faculty, project_id, wanted).status_code == 200
        assert [row["project_id"] for row in get(client, student, "/api/v1/solutions")] == expected
        assert get(client, faculty, "/api/v1/solutions/stats")["live_solutions"] == len(expected)
        row = db.get(Project, uuid.UUID(project_id))
        assert row.published is wanted
        assert row.completed_at == completed_at
        assert get(client, faculty, "/api/v1/credits/summary") == ledger
        assert get(client, student, "/api/v1/credits/summary") == student_ledger
        assert get(client, faculty, "/api/v1/portfolio/me")["stats"]["verified_solutions"] == len(
            expected
        )


# --- one transaction, or none ----------------------------------------------------------------


def test_a_publication_whose_audit_fails_publishes_nothing(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules, monkeypatch
) -> None:
    """`published = true` with no audit row is exactly the partial state the
    publication lifecycle must never contain."""
    project_id = approved_project(client, student, faculty, problem)

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(projects, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        projects.set_publication(db, faculty, uuid.UUID(project_id), True)
    db.rollback()

    assert db.get(Project, uuid.UUID(project_id)).published is False
    assert get(client, student, "/api/v1/solutions") == []


def test_an_award_whose_ledger_write_fails_completes_nothing(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules, monkeypatch
) -> None:
    """Completion, the award row, the students' credits and the mentor's own
    all share one transaction (UD-1)."""
    project_id = approved_project(client, student, faculty, problem)
    before = db.query(CreditTransaction).count()

    def flaky(session, transaction):
        raise RuntimeError("ledger unavailable")

    monkeypatch.setattr(credits_repo, "add_transaction", flaky)

    with pytest.raises(RuntimeError):
        award(client, faculty, project_id)
    db.rollback()

    row = db.get(Project, uuid.UUID(project_id))
    assert row.completed_at is None
    assert db.query(CreditAward).filter_by(project_id=row.id).count() == 0
    assert db.query(CreditTransaction).count() == before
    # And the work is still exactly where the mentor left it: approved, awaiting
    # an award, which they can still make once the ledger is writable again.
    monkeypatch.undo()
    assert award(client, faculty, project_id).status_code == 200


# --- query cost --------------------------------------------------------------------------------


def test_the_faculty_surfaces_do_not_grow_queries_with_mentored_projects(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """A mentor carrying two projects and one carrying six cost the same reads.

    The baseline is measured with projects already in place, not with none: the
    batched loaders skip their query entirely on an empty set, so a from-zero
    comparison would report that skip as growth and hide a real one.
    """

    def add_project(index: int) -> None:
        extra = make_problem(
            db, institution=institution_a, author=faculty, title=f"Problem {index}"
        )
        row = make_project(
            db,
            problem=extra,
            mentor=faculty,
            student=student,
            completed=False,
            title=f"Project {index}",
        )
        db.add(
            StageSubmission(
                project_id=row.id,
                stage=SubmissionStage.IDEA,
                status=SubmissionStatus.SUBMITTED,
                submitted_at=datetime.now(UTC),
            )
        )
        db.flush()

    pending_idea(client, student, problem)
    add_project(1)
    paths = (
        "/api/v1/projects",
        "/api/v1/reviews/queues",
        "/api/v1/portfolio/me",
        "/api/v1/credits/summary",
        "/api/v1/credits/history",
        "/api/v1/leaderboard/faculty",
        "/api/v1/solutions",
        "/api/v1/faculty/me/profile",
    )
    headers = auth_header(client, faculty.email)

    baseline = {}
    for path in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200, path
        baseline[path] = len(queries(statements))

    for index in range(2, 6):
        add_project(index)

    assert len(get(client, faculty, "/api/v1/projects")) == 6
    assert len(queue_ids(client, faculty)["idea"]) == 6
    for path in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200, path
        assert len(queries(statements)) == baseline[path], path
