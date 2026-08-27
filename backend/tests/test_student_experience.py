"""The product from a student's seat.

Every other test file proves one module, and `test_integration` proves the
modules agree on a solo project. This file walks the journey the student
actually takes — browse, form a team, apply as its lead, submit each stage,
be reviewed, be credited, be published, be ranked — and then walks the far
larger set of things a student must not be able to do from that same seat.

Nothing here is a new capability. Every request below goes to an endpoint an
earlier phase already shipped; what is new is the composition and the negative
space around it. If a test in this file needed a new table, a new score or a
second copy of a number, that would be the bug it is looking for.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, SubmissionStatus, UserStatus
from app.modules.projects import service as projects
from app.modules.projects.models import Project, StageSubmission
from tests.conftest import auth_header, make_problem, make_user
from tests.test_applications import APPLICATION, IDEA
from tests.test_credits import AWARD, TOTAL, approved_project, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_integration import queries
from tests.test_leaderboard import credit
from tests.test_portfolio import counting, make_project
from tests.test_projects import FINAL, POC, open_project
from tests.test_reviews import EVALUATION, FEEDBACK, audit_actions, decide, submit
from tests.test_solutions import LIVE_URL, STORED_URL
from tests.test_teams import create_team

# The Phase 5A rule table, bound under its fixture name so pytest resolves it here.
seeded_rules = _seeded_rules

# Every read a student's own surfaces make. Kept as one list because most of
# what this file checks is that the whole set behaves alike — all authenticated,
# all institution-scoped, all closed the moment the account is.
STUDENT_READS = (
    "/api/v1/auth/me",
    "/api/v1/problems",
    "/api/v1/projects",
    "/api/v1/teams",
    "/api/v1/teams/invitations",
    "/api/v1/credits/summary",
    "/api/v1/credits/history",
    "/api/v1/credits/categories",
    "/api/v1/credits/pipeline",
    "/api/v1/leaderboard/students",
    "/api/v1/portfolio/me",
    "/api/v1/solutions",
    "/api/v1/students/me/profile",
)


def get(client: TestClient, viewer, path: str, **params) -> dict | list:
    response = client.get(path, params=params, headers=auth_header(client, viewer.email))
    assert response.status_code == 200, f"{path}: {response.text}"
    return response.json()["data"]


def apply_as_team(client: TestClient, lead, problem, team_id: str):
    return client.post(
        f"/api/v1/problems/{problem.id}/applications",
        json=APPLICATION | {"team_id": team_id},
        headers=auth_header(client, lead.email),
    )


def crewed_team(client: TestClient, lead, mate, problem) -> dict:
    """A two-person team: the lead invites, the mate accepts."""
    team = create_team(client, lead, problem)
    invited = client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": mate.email, "role": "ML Engineer"},
        headers=auth_header(client, lead.email),
    )
    assert invited.status_code == 201, invited.text

    mate_headers = auth_header(client, mate.email)
    inbox = get(client, mate, "/api/v1/teams/invitations")
    assert len(inbox) == 1
    accepted = client.post(
        f"/api/v1/teams/invitations/{inbox[0]['id']}/accept", headers=mate_headers
    )
    assert accepted.status_code == 200, accepted.text
    return team


def rank_of(client: TestClient, viewer) -> dict | None:
    board = get(client, viewer, "/api/v1/leaderboard/students")
    return next((row for row in board if row["id"] == str(viewer.id)), None)


# --- the journey ---------------------------------------------------------------------


def test_a_team_carries_one_project_from_a_problem_to_a_published_solution(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    """The whole student experience in one pass, through the team route.

    Every assertion reads a surface the frozen frontend reads, and every state
    change goes through the module that owns it — the review engine decides,
    the Credit Engine completes, the mentor publishes. The student's own verbs
    are three: apply, save, submit.
    """
    # Browse, then read the brief. The problem is open and takes a team.
    catalog = get(client, student, "/api/v1/problems")
    assert [row["id"] for row in catalog["items"]] == [str(problem.id)]
    brief = get(client, student, f"/api/v1/problems/{problem.id}")
    assert brief["application_status"] == "none"

    # Form the team and apply as its lead. One project, two members.
    team = crewed_team(client, student, other_student, problem)
    applied = apply_as_team(client, student, problem, team["id"])
    assert applied.status_code == 201, applied.text
    project_id = applied.json()["data"]["id"]

    # Both members are on it, and both can see it, from the first moment.
    for member in (student, other_student):
        mine = get(client, member, "/api/v1/projects")
        assert [row["id"] for row in mine] == [project_id]
        assert {m["id"] for m in mine[0]["members"]} == {str(student.id), str(other_student.id)}

    # Stage 1 — the idea, saved as a draft first, then submitted for review.
    journey = get(client, student, f"/api/v1/projects/{project_id}/journey")
    assert journey["current_stage"] == "idea"
    assert journey["unlocked_stages"] == ["idea"]
    submit(client, student, project_id, SubmissionStage.IDEA)
    assert decide(client, faculty, project_id, SubmissionStage.IDEA, "approve").status_code == 200

    # Stage 2 — the proof of concept, and the selection that gates the final.
    submit(client, other_student, project_id, SubmissionStage.POC)
    selected = decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    assert selected.status_code == 200, selected.text

    # Stage 3/final — the finished project, with somewhere a reader can open it.
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

    # Approved is not finished: nothing counts it yet (UD-1).
    assert get(client, student, "/api/v1/portfolio/me")["projects"] == []
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None

    # The Credit Engine is what completes it, and it pays both builders.
    assert award(client, faculty, project_id).status_code == 200
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None

    for member in (student, other_student):
        summary = get(client, member, "/api/v1/credits/summary")
        assert summary["total"] == TOTAL
        card = get(client, member, "/api/v1/portfolio/me")
        assert [row["id"] for row in card["projects"]] == [project_id]
        assert card["total_credits"] == summary["total"]
        assert card["level_name"] == summary["level_name"]
        ranked = rank_of(client, member)
        assert ranked["credits"] == summary["total"]
        assert ranked["badge"] == summary["level_name"]
        assert ranked["contributions"] == 1

    # Publication is the mentor's verb, and it is what the hub reads.
    assert get(client, student, "/api/v1/solutions") == []
    assert publish(client, faculty, project_id).status_code == 200
    solution = get(client, student, "/api/v1/solutions")[0]
    assert solution["project_id"] == project_id
    assert solution["url"] == STORED_URL
    assert solution["credits"] == TOTAL
    assert {row["name"] for row in solution["builders"]} == {student.name, other_student.name}

    # And the profile is untouched by all of it — it never held these numbers.
    profile = get(client, student, "/api/v1/students/me/profile")
    assert profile["user_id"] == str(student.id)
    assert set(profile) & {"total_credits", "rank", "badge", "projects"} == set()


# --- entitlement ----------------------------------------------------------------------


def test_a_student_sees_only_the_projects_they_are_actually_on(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    """Two students, two problems, one project each. Neither list mentions the other."""
    mine = open_project(client, student, problem)
    theirs_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Campus energy"
    )
    theirs = open_project(client, other_student, theirs_problem)

    assert [row["id"] for row in get(client, student, "/api/v1/projects")] == [mine]
    assert [row["id"] for row in get(client, other_student, "/api/v1/projects")] == [theirs]


def test_a_peer_cannot_open_or_write_a_project_they_are_not_on(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    """Same institution, same problem, no membership: reads and writes both denied.

    403 rather than 404 here — the project is in the peer's own institution, so
    its existence is not the secret. What it contains is.
    """
    project_id = open_project(client, student, problem)
    headers = auth_header(client, other_student.email)

    assert client.get(f"/api/v1/projects/{project_id}", headers=headers).status_code == 403
    assert client.get(f"/api/v1/projects/{project_id}/journey", headers=headers).status_code == 403
    intruded = client.put(
        f"/api/v1/projects/{project_id}/idea?submit=true", json=POC, headers=headers
    )
    assert intruded.status_code in (403, 422)


def test_leaving_a_team_takes_its_project_off_your_list(
    client: TestClient, student, other_student, problem
) -> None:
    """Visibility follows the roster, because that is where membership lives."""
    team = crewed_team(client, student, other_student, problem)
    assert apply_as_team(client, student, problem, team["id"]).status_code == 201
    assert len(get(client, other_student, "/api/v1/projects")) == 1

    left = client.delete(
        f"/api/v1/teams/{team['id']}/members/me", headers=auth_header(client, other_student.email)
    )
    assert left.status_code == 200, left.text

    assert get(client, other_student, "/api/v1/projects") == []
    assert len(get(client, student, "/api/v1/projects")) == 1


# --- stage gating ---------------------------------------------------------------------


def test_a_student_cannot_skip_a_stage(
    client: TestClient, student, faculty, problem
) -> None:
    """The order is the product: no proof of concept before an idea is filed, no
    final project before faculty select the team for one."""
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)

    early_poc = client.put(
        f"/api/v1/projects/{project_id}/proof-of-concept?submit=true", json=POC, headers=headers
    )
    assert early_poc.status_code == 409
    assert early_poc.json()["error_code"] == "BUSINESS_RULE_VIOLATION"

    submit(client, student, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)

    # Approved is not selected: only selection unlocks the final stage.
    approved = decide(client, faculty, project_id, SubmissionStage.POC, "approve")
    assert approved.status_code == 200, approved.text
    early_final = client.put(
        f"/api/v1/projects/{project_id}/final?submit=true", json=FINAL, headers=headers
    )
    assert early_final.status_code == 409


def test_a_stage_that_is_settled_or_in_flight_takes_no_further_edits(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """Submitted, approved and rejected are all closed to the student — the
    first because faculty are reading it, the other two because they are verdicts."""
    headers = auth_header(client, student.email)

    def rewrite(project_id: str):
        return client.put(
            f"/api/v1/projects/{project_id}/idea?submit=true", json=IDEA, headers=headers
        )

    pending = open_project(client, student, problem)
    submit(client, student, pending, SubmissionStage.IDEA)
    assert rewrite(pending).status_code == 409

    decide(client, faculty, pending, SubmissionStage.IDEA, "approve")
    assert rewrite(pending).status_code == 409

    # A second problem, because one student may hold one live application each.
    second = make_problem(db, institution=institution_a, author=faculty, title="Campus energy")
    rejected = open_project(client, student, second)
    submit(client, student, rejected, SubmissionStage.IDEA)
    decide(client, faculty, rejected, SubmissionStage.IDEA, "reject", **FEEDBACK)
    settled = rewrite(rejected)
    assert settled.status_code == 409
    assert "rejected" in settled.json()["message"]


def test_changes_requested_is_the_one_verdict_a_student_can_answer(
    client: TestClient, student, faculty, problem
) -> None:
    """A resubmission drops the verdict it answers — a stage carries one review."""

    project_id = open_project(client, student, problem)
    submit(client, student, project_id, SubmissionStage.IDEA)
    sent_back = decide(
        client, faculty, project_id, SubmissionStage.IDEA, "changes_requested", **FEEDBACK
    )
    assert sent_back.status_code == 200, sent_back.text

    state = get(client, student, f"/api/v1/projects/{project_id}/journey")
    assert state["idea"]["status"] == "changes_requested"
    assert state["idea"]["review"]["weaknesses"] == FEEDBACK["weaknesses"]

    again = client.put(
        f"/api/v1/projects/{project_id}/idea?submit=true",
        json=IDEA,
        headers=auth_header(client, student.email),
    )
    assert again.status_code == 200, again.text
    state = get(client, student, f"/api/v1/projects/{project_id}/journey")
    assert state["idea"]["status"] == "submitted"
    assert state["idea"]["review"] is None


# --- what a student cannot do ----------------------------------------------------------


def test_a_student_cannot_award_credits_review_or_publish(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    """The three verbs that decide a student's own standing are all faculty's.

    Every one of them is refused at the role gate, before any body is read, so
    there is no payload a student can send that reaches the Credit Engine.
    """

    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)

    for method, path, body in (
        ("post", f"/api/v1/projects/{project_id}/credits", AWARD),
        ("post", f"/api/v1/projects/{project_id}/publication", {"publish": True}),
        ("post", f"/api/v1/reviews/{project_id}/idea", {"decision": "approve"}),
    ):
        response = getattr(client, method)(path, json=body, headers=headers)
        assert response.status_code == 403, path
        assert response.json()["error_code"] == "FORBIDDEN"

    assert get(client, student, "/api/v1/credits/summary")["total"] == 0
    assert rank_of(client, student) is None


def test_a_student_cannot_write_their_own_standing_through_the_profile(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The profile is the only thing a student owns, and it holds no numbers.

    Sending them anyway is a validation error, not a silent no-op: an ignored
    field would leave the caller believing the edit landed.
    """

    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    before = get(client, student, "/api/v1/credits/summary")

    hostile = client.patch(
        "/api/v1/students/me/profile",
        json={
            "headline": "Innovation Champion",
            "total_credits": 9999,
            "rank": 1,
            "level": 9,
            "institution_id": str(uuid.uuid4()),
            "role": "faculty",
        },
        headers=auth_header(client, student.email),
    )
    assert hostile.status_code == 422
    assert hostile.json()["error_code"] == "VALIDATION_ERROR"

    assert get(client, student, "/api/v1/credits/summary") == before
    assert rank_of(client, student)["credits"] == TOTAL
    assert db.get(Project, uuid.UUID(project_id)).published is False


def test_a_student_cannot_apply_on_behalf_of_a_team_they_do_not_lead(
    client: TestClient, student, other_student, problem
) -> None:
    team = crewed_team(client, student, other_student, problem)

    usurped = apply_as_team(client, other_student, problem, team["id"])
    assert usurped.status_code == 403
    assert usurped.json()["message"] == "Only the team lead can apply on behalf of the team."
    assert get(client, other_student, "/api/v1/projects") == []


# --- identity ---------------------------------------------------------------------------


@pytest.mark.parametrize("closure", ["suspended", "deleted"])
def test_closing_an_account_closes_the_whole_student_surface_mid_session(
    client: TestClient, db: Session, student, problem, closure: str
) -> None:
    """A live token is not a standing permission: every request re-reads the row.

    Both closures are checked because they are recorded differently — one is a
    status, one is a timestamp — and `is_active` is what unifies them.
    """
    open_project(client, student, problem)
    headers = auth_header(client, student.email)
    assert client.get("/api/v1/projects", headers=headers).status_code == 200

    if closure == "suspended":
        student.status = UserStatus.SUSPENDED
    else:
        student.deleted_at = datetime.now(UTC)
    db.flush()

    for path in STUDENT_READS:
        response = client.get(path, headers=headers)
        assert response.status_code == 401, path
        assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_an_anonymous_caller_reaches_no_student_surface(client: TestClient) -> None:
    for path in STUDENT_READS:
        response = client.get(path)
        assert response.status_code == 401, path
        assert response.json()["error_code"] == "UNAUTHENTICATED"


# --- the institution boundary ------------------------------------------------------------


def test_no_student_surface_crosses_the_institution_boundary(
    client: TestClient,
    db: Session,
    institution_a,
    institution_b,
    student,
    faculty,
    problem,
    seeded_rules,
) -> None:
    """Student A's work is invisible to institution B, in both directions.

    A foreign id answers 404 rather than 403: a student must not be able to
    learn that another tenant's project, team or problem exists at all.
    """

    # A separate problem for the team below — a student cannot both lead a team
    # and apply solo for the same problem (ADR: one mode per problem).
    team_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Campus Water Metering"
    )
    team = create_team(client, student, team_problem)
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    assert publish(client, faculty, project_id).status_code == 200

    outsider = make_user(db, institution=institution_b, email="rhea.mehta@other.edu")
    headers = auth_header(client, outsider.email)

    for path in (
        f"/api/v1/problems/{problem.id}",
        f"/api/v1/projects/{project_id}",
        f"/api/v1/projects/{project_id}/journey",
        f"/api/v1/teams/{team['id']}",
    ):
        assert client.get(path, headers=headers).status_code == 404, path

    # Nor can they write to any of it.
    assert (
        client.post(
            f"/api/v1/problems/{problem.id}/applications",
            json=APPLICATION,
            headers=headers,
        ).status_code
        == 404
    )
    assert (
        client.put(
            f"/api/v1/projects/{project_id}/idea", json=POC, headers=headers
        ).status_code
        in (404, 422)
    )

    # And every collection they can read holds only their own institution's rows.
    assert get(client, outsider, "/api/v1/problems")["items"] == []
    assert get(client, outsider, "/api/v1/projects") == []
    assert get(client, outsider, "/api/v1/teams") == []
    assert get(client, outsider, "/api/v1/solutions") == []
    assert get(client, outsider, "/api/v1/leaderboard/students") == []
    assert get(client, outsider, "/api/v1/portfolio/me")["total_credits"] == 0


def test_a_student_cannot_widen_their_own_scope_through_the_query_string(
    client: TestClient, db: Session, institution_b, student, faculty, problem, seeded_rules
) -> None:
    """Institution, identity and score are all derived. None is an input."""

    peer = make_user(db, institution=institution_b, email="dev.nair@other.edu")
    credit(db, peer, 5000)
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    hostile = {
        "institution_id": str(institution_b.id),
        "user_id": str(peer.id),
        "student_id": str(peer.id),
        "role": "faculty",
        "credits": 9999,
        "points": 9999,
    }
    headers = auth_header(client, student.email)

    for path in STUDENT_READS:
        clean = client.get(path, headers=headers)
        dirty = client.get(path, params=hostile, headers=headers)
        assert dirty.status_code == 200, f"{path}: {dirty.text}"
        assert clean.json()["data"] == dirty.json()["data"], path

    assert rank_of(client, student)["credits"] == TOTAL


# --- one source per number ----------------------------------------------------------------


def test_every_number_the_student_pages_show_comes_from_one_source(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    """The dashboard, credits page, portfolio and leaderboard are four readings
    of the same ledger. Composed from the endpoints the frozen frontend calls —
    no endpoint aggregates them, because an aggregate could disagree.
    """

    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    assert publish(client, faculty, project_id).status_code == 200

    summary = get(client, student, "/api/v1/credits/summary")
    history = get(client, student, "/api/v1/credits/history")
    categories = get(client, student, "/api/v1/credits/categories")
    card = get(client, student, "/api/v1/portfolio/me")
    ranked = rank_of(client, student)
    mine = get(client, student, "/api/v1/projects")
    profile = get(client, student, "/api/v1/students/me/profile")

    # The credit total, read five ways.
    assert summary["total"] == TOTAL
    assert sum(row["points"] for row in history) == TOTAL
    assert sum(row["value"] for row in categories) == TOTAL
    assert card["total_credits"] == TOTAL
    assert ranked["credits"] == TOTAL

    # The level, read three ways.
    assert card["level_name"] == summary["level_name"] == ranked["badge"]

    # Completion, read three ways — and it is the same project each time.
    completed = [row for row in mine if row["status"] == "completed"]
    assert [row["id"] for row in completed] == [project_id]
    assert [row["id"] for row in card["projects"]] == [project_id]
    assert card["stats"]["projects_completed"] == 1
    assert card["stats"]["verified_solutions"] == 1
    assert ranked["contributions"] == 1

    # Identity, read three ways.
    assert profile["user_id"] == card["user_id"] == ranked["id"] == str(student.id)
    assert profile["name"] == card["name"] == ranked["name"] == student.name


def test_the_department_a_student_sets_is_the_one_every_surface_labels_them_with(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    """One edit, three surfaces, no second copy of the field."""

    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    assert get(client, student, "/api/v1/portfolio/me")["department"] is None
    assert rank_of(client, student)["department"] is None

    saved = client.patch(
        "/api/v1/students/me/profile",
        json={"department": "Computer Engineering"},
        headers=auth_header(client, student.email),
    )
    assert saved.status_code == 200, saved.text

    assert saved.json()["data"]["department"] == "Computer Engineering"
    assert get(client, student, "/api/v1/portfolio/me")["department"] == "Computer Engineering"
    assert rank_of(client, student)["department"] == "Computer Engineering"


# --- query cost ------------------------------------------------------------------------------


def test_the_student_surfaces_do_not_grow_queries_with_projects(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """A student with one project and a student with five cost the same reads.

    The baseline is measured with a project already in place, not with none:
    the batched loaders skip their query entirely on an empty set, so a
    from-zero comparison would report that skip as growth and hide a real one.
    """

    def add_project(index: int) -> None:
        extra = make_problem(
            db, institution=institution_a, author=faculty, title=f"Problem {index}"
        )
        row = make_project(
            db, problem=extra, mentor=faculty, student=student, title=f"Project {index}"
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

    open_project(client, student, problem)
    add_project(1)
    paths = (
        "/api/v1/projects",
        "/api/v1/portfolio/me",
        "/api/v1/credits/summary",
        "/api/v1/credits/history",
        "/api/v1/credits/pipeline",
        "/api/v1/solutions",
        "/api/v1/leaderboard/students",
        "/api/v1/students/me/profile",
    )
    headers = auth_header(client, student.email)

    baseline = {}
    for path in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200, path
        baseline[path] = len(queries(statements))

    for index in range(2, 6):
        add_project(index)

    assert len(get(client, student, "/api/v1/projects")) == 6
    for path in paths:
        with counting(db) as statements:
            assert client.get(path, headers=headers).status_code == 200, path
        assert len(queries(statements)) == baseline[path], path


# --- partial state ----------------------------------------------------------------------------


def test_a_submission_whose_audit_fails_is_not_a_submission(
    client: TestClient, db: Session, student, problem, monkeypatch
) -> None:
    """The stage row and its audit entry share one transaction.

    A submission that faculty can see but the audit log cannot account for would
    be exactly the partial state the review lifecycle must never contain.
    """

    project_id = open_project(client, student, problem)

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(projects, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        projects.save_stage(
            db, student, uuid.UUID(project_id), SubmissionStage.IDEA, IDEA, submit=True
        )
    db.rollback()

    row = (
        db.query(StageSubmission)
        .filter_by(project_id=uuid.UUID(project_id), stage=SubmissionStage.IDEA)
        .one()
    )
    assert row.status is SubmissionStatus.DRAFT
    assert row.submitted_at is None
    assert row.payload is None
    assert not any(action.startswith("submission.") for action in audit_actions(db))
