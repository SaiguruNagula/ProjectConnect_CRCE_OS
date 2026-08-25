"""The faculty workflow as the frontend consumes it (Phase 9).

The Review Engine's own rules are tested in test_reviews.py and are not
restated here. What this file guards is the seam the faculty repository was
wired to: that every role but faculty is turned away from all five verbs, that
the queue card carries the exact field names the repository maps, and that each
mutation answers with the journey the panel re-renders from — so the frontend
never has to guess the next state, and a backend rename fails here instead of
silently emptying a card.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, SubmissionStatus, UserRole
from app.modules.projects.models import StageSubmission
from tests.conftest import auth_header, make_user
from tests.test_credits import AWARD, approved_project, award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_reviews import FEEDBACK, decide, pending_idea

# The rule table the award endpoint prices from, re-exported so the tests that
# award credits can request it (the same borrowing test_faculty_credits does).
seeded_rules = _seeded_rules

QUEUE_IDS = ("idea", "poc", "final", "completed")

# The names repositories/api/reviews.repository.ts reads off a queue card. Three
# of them it renames (`id`, `project_title`, `attachment_count`); the rest it
# passes through untouched.
CARD_FIELDS = {
    "id",
    "project_title",
    "problem_id",
    "problem_title",
    "team_id",
    "team_name",
    "members",
    "mentor_name",
    "stage",
    "submitted_at",
    "status",
    "attachment_count",
    "last_reviewed_stage",
}

# Every role that is not faculty. The review verbs admit one role, so admin and
# principal are as unauthorized here as a student is.
OTHER_ROLES = [UserRole.STUDENT, UserRole.ADMIN, UserRole.PRINCIPAL]


def queues(client: TestClient, user) -> dict:
    response = client.get("/api/v1/reviews/queues", headers=auth_header(client, user.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def staff(db: Session, institution, role: UserRole):
    return make_user(db, institution=institution, email=f"{role.value}@crce.edu", role=role)


# --- who may work a queue ----------------------------------------------------------


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_no_role_but_faculty_reaches_the_review_verbs(
    client: TestClient, db: Session, institution_a, student, faculty, problem, role: UserRole
) -> None:
    project_id = pending_idea(client, student, problem)
    intruder = student if role is UserRole.STUDENT else staff(db, institution_a, role)
    headers = auth_header(client, intruder.email)

    listed = client.get("/api/v1/reviews/queues", headers=headers)
    opened = client.get(f"/api/v1/reviews/{project_id}", headers=headers)
    decided = decide(client, intruder, project_id, SubmissionStage.IDEA, "approve")

    assert [listed.status_code, opened.status_code, decided.status_code] == [403, 403, 403]
    assert decided.json()["error_code"] == "FORBIDDEN"

    # Turned away means nothing moved: the idea is still waiting for its mentor.
    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.status is SubmissionStatus.SUBMITTED
    assert row.reviewed_by is None


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_the_post_approval_verbs_admit_faculty_alone(
    client: TestClient, db: Session, institution_a, student, role: UserRole
) -> None:
    intruder = student if role is UserRole.STUDENT else staff(db, institution_a, role)
    headers = auth_header(client, intruder.email)
    project_id = str(uuid.uuid4())

    awarded = client.post(f"/api/v1/projects/{project_id}/credits", json=AWARD, headers=headers)
    published = client.post(
        f"/api/v1/projects/{project_id}/publication", json={"publish": True}, headers=headers
    )

    # The role gate settles it before the project is ever looked up — a 404 here
    # would mean an unauthorized caller had learned whether the project exists.
    assert awarded.status_code == 403
    assert published.status_code == 403


def test_the_workflow_is_closed_to_anonymous_callers(client: TestClient) -> None:
    listed = client.get("/api/v1/reviews/queues")
    published = client.post(f"/api/v1/projects/{uuid.uuid4()}/publication", json={"publish": True})

    assert [listed.status_code, published.status_code] == [401, 401]
    assert listed.json()["error_code"] == "UNAUTHENTICATED"


def test_a_faculty_member_reads_their_own_queue(client: TestClient, faculty) -> None:
    body = queues(client, faculty)

    # A mentor with nothing to review gets four empty queues, not an error and
    # not a missing key: the page renders its own "all caught up" state.
    assert body == {queue: [] for queue in QUEUE_IDS}


def test_another_college_has_no_queue_here(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    pending_idea(client, student, problem)
    outsider = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )

    assert queues(client, outsider) == {queue: [] for queue in QUEUE_IDS}
    assert len(queues(client, faculty)["idea"]) == 1


# --- the card the repository maps --------------------------------------------------


def test_a_queue_card_carries_every_field_the_repository_reads(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    card = queues(client, faculty)["idea"][0]

    assert set(card) == CARD_FIELDS
    # The three the repository renames, by the names it renames them from. The
    # heading it shows is problem_title, with project_title behind it — both are
    # populated here, so a rename of either empties a card rather than the page.
    assert card["id"] == project_id
    assert isinstance(card["attachment_count"], int)
    assert card["problem_title"] == problem.title
    assert card["project_title"]
    # …and the roster it passes straight through to the card's avatars.
    assert card["members"] and set(card["members"][0]) == {"id", "name", "role", "avatar_initials"}
    assert card["stage"] == "idea"
    assert card["status"] == "idea_submitted"
    assert card["submitted_at"] is not None


# --- every mutation answers with the state to render -------------------------------


def test_a_decision_returns_the_journey_the_panel_re_renders(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    response = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    assert response.status_code == 200, response.text
    journey = response.json()["data"]
    assert journey["project_id"] == project_id
    # The approval and what it unlocked, in the one response — nothing is left
    # for the frontend to infer.
    assert journey["idea"]["status"] == "approved"
    assert "poc" in journey["unlocked_stages"]


def test_awarding_and_publishing_return_the_journey_too(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    awarded = award(client, faculty, project_id)
    published = publish(client, faculty, project_id)

    assert awarded.status_code == 200, awarded.text
    assert published.status_code == 200, published.text
    assert awarded.json()["data"]["credits"]["total"] > 0
    assert published.json()["data"]["published"] is True
    # Publication is a flag the projects module flips, and it goes both ways.
    assert publish(client, faculty, project_id, publish=False).json()["data"]["published"] is False


def test_a_queue_empties_as_its_work_is_decided(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    assert len(queues(client, faculty)["idea"]) == 1

    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    # The card leaves the idea queue on the backend's say-so; the frontend
    # reloads rather than removing it locally.
    assert queues(client, faculty)["idea"] == []


def test_a_second_click_does_not_decide_the_stage_twice(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    first = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    second = decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    assert first.status_code == 200
    assert second.status_code == 409
    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.status is SubmissionStatus.APPROVED


# --- identity is the token's -------------------------------------------------------


def test_a_decision_cannot_name_its_own_reviewer(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )

    smuggled = client.post(
        f"/api/v1/reviews/{project_id}/idea",
        json={"decision": "approve", "reviewed_by": str(colleague.id)},
        headers=auth_header(client, faculty.email),
    )

    assert smuggled.status_code == 422
    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.status is SubmissionStatus.SUBMITTED


def test_a_query_parameter_cannot_stand_in_for_the_token(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )

    response = client.post(
        f"/api/v1/reviews/{project_id}/idea",
        params={"faculty_id": str(colleague.id), "user_id": str(colleague.id)},
        json={"decision": "approve"},
        headers=auth_header(client, faculty.email),
    )

    assert response.status_code == 200, response.text
    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.reviewed_by == faculty.id
