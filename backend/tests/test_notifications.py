"""Phase 12 — notifications.

Two things are being proved here, and they are different things.

The first is that the feed is private: it is the token's, an id belonging to
someone else is neither readable nor writable, and no query parameter changes
whose feed is returned.

The second is that a notification says something true. Every creation test
below drives the *real* business endpoint — a review decision, an award, a join
request — and then checks who was told. Where a number appears in a
notification it is compared against the module that owns it (the Credit
Engine's ledger), never against a figure typed into this file, so a
notification that started inventing its own totals would fail here.

Rows written inside one test share a transaction, so `created_at` is identical
across them and feed order is not meaningful. Nothing below asserts on order.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, UserRole
from app.modules.credits import config as credit_config
from app.modules.notifications import service as notifications
from app.modules.projects.models import Project
from tests.conftest import auth_header, make_user
from tests.test_applications import apply
from tests.test_credits import TOTAL, approved_project, award, ledger, team_project
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_reviews import EVALUATION, FEEDBACK, decide, pending_idea, submit
from tests.test_suggestions import create_suggestion
from tests.test_teams import JOIN_MESSAGE, create_team

seeded_rules = _seeded_rules

ALL_ROLES = [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN, UserRole.PRINCIPAL]


def feed(client: TestClient, user) -> list[dict]:
    response = client.get("/api/v1/notifications", headers=auth_header(client, user.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def titles(client: TestClient, user) -> list[str]:
    return [row["title"] for row in feed(client, user)]


def mark_read(client: TestClient, user, notification_id: str):
    return client.patch(
        f"/api/v1/notifications/{notification_id}/read",
        headers=auth_header(client, user.email),
    )


def awarded_team_project(client: TestClient, lead, member, faculty, problem) -> str:
    """A two-person project carried to an approved final stage — award-ready."""
    project_id = team_project(client, lead, member, problem)
    submit(client, lead, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, lead, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    submit(client, lead, project_id, SubmissionStage.FINAL)
    response = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )
    assert response.status_code == 200, response.text
    return project_id


# --- access -----------------------------------------------------------------------


def test_the_feed_is_closed_to_anonymous_callers(client: TestClient) -> None:
    for response in (
        client.get("/api/v1/notifications"),
        client.patch(f"/api/v1/notifications/{uuid.uuid4()}/read"),
        client.post("/api/v1/notifications/read-all"),
    ):
        assert response.status_code == 401, response.text
        assert response.json()["error_code"] == "UNAUTHENTICATED"


@pytest.mark.parametrize("role", ALL_ROLES)
def test_every_role_has_a_feed_and_it_starts_empty(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    """The bell is on every layout, so there is no role gate — only ownership."""
    user = make_user(db, institution=institution_a, email=f"{role.value}@crce.edu", role=role)

    assert feed(client, user) == []


def test_a_student_cannot_read_another_students_notifications(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    assert titles(client, student) != []
    assert feed(client, other_student) == []


def test_a_notification_id_belonging_to_someone_else_is_not_readable(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    """404, not 403: a stranger learns nothing, not even that the row exists."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    theirs = feed(client, student)[0]["id"]

    response = mark_read(client, other_student, theirs)

    assert response.status_code == 404, response.text
    assert all(row["read"] is False for row in feed(client, student))


def test_a_query_parameter_cannot_choose_whose_feed_is_read(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    spoofed = client.get(
        "/api/v1/notifications",
        params={"user_id": str(student.id), "institution_id": str(student.institution_id)},
        headers=auth_header(client, other_student.email),
    )

    assert spoofed.status_code == 200, spoofed.text
    assert spoofed.json()["data"] == []


def test_notifications_do_not_cross_institutions(
    client: TestClient, db: Session, student, faculty, problem, institution_b, seeded_rules
) -> None:
    stranger = make_user(db, institution=institution_b, email="rahul.desai@other.edu")
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    assert titles(client, student) != []
    assert feed(client, stranger) == []


# --- what raises a notification ----------------------------------------------------


def test_a_review_decision_tells_the_team_and_not_the_reviewer(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    project_id = team_project(client, student, other_student, problem)
    submit(client, student, project_id, SubmissionStage.IDEA)

    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    assert "Idea approved" in titles(client, student)
    assert "Idea approved" in titles(client, other_student)
    assert "Idea approved" not in titles(client, faculty)


def test_a_rejection_is_not_delivered_as_good_news(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The tone is the Review Engine's reading of its own verdict."""
    project_id = pending_idea(client, student, problem)

    decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    raised = [row for row in feed(client, student) if row["title"] == "Idea rejected"]
    assert len(raised) == 1
    assert raised[0]["kind"] == "error"
    assert raised[0]["entity"] == "project"


def test_reviewing_notifies_the_reviewer_of_what_reviewing_paid(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The amount is the Credit Engine's, so it is read back from the ledger."""
    project_id = pending_idea(client, student, problem)

    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    paid = ledger(db, faculty)
    earned = [row for row in feed(client, faculty) if row["title"] == "Credits earned"]
    assert len(paid) == len(earned) == 1
    assert f"{paid[0].points:+d} credits" in earned[0]["message"]


def test_an_award_tells_every_member_what_the_ledger_says(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = awarded_team_project(client, student, other_student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200

    for member in (student, other_student):
        posted = sum(row.points for row in ledger(db, member))
        raised = [row for row in feed(client, member) if row["title"] == "Credits awarded"]
        assert len(raised) == 1
        assert f"{posted:+d} credits" in raised[0]["message"]
        assert posted == TOTAL


def test_the_mentor_is_told_about_their_share_not_the_teams_award(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = awarded_team_project(client, student, other_student, faculty, problem)

    award(client, faculty, project_id)

    mentorship = [
        row.points
        for row in ledger(db, faculty)
        if row.source == credit_config.SOURCE_MENTORSHIP
    ]
    share = [row for row in feed(client, faculty) if row["title"] == "Mentorship credits"]
    assert len(mentorship) == len(share) == 1
    assert f"{mentorship[0]:+d} credits" in share[0]["message"]
    assert "Credits awarded" not in titles(client, faculty)


def test_revising_an_award_notifies_again_with_the_difference(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """A correction is news. The delta is the engine's, not this test's."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    award(client, faculty, project_id, bonus=60)

    revised = [row for row in feed(client, student) if row["title"] == "Credits revised"]
    assert len(revised) == 1
    assert [line.points for line in ledger(db, student)] == [TOTAL, 50]
    assert "+50 credits" in revised[0]["message"]


def test_applying_to_a_problem_tells_its_author(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The review queues only carry submitted work, so an application is
    otherwise invisible to the faculty member who posted the problem."""
    apply(client, student, problem)

    raised = [row for row in feed(client, faculty) if row["entity"] == "project"]
    assert [row["title"] for row in raised] == ["New application to your problem"]
    assert student.name in raised[0]["message"]
    assert titles(client, student) == []


def test_a_second_application_to_the_same_problem_does_not_notify_again(
    client: TestClient, db: Session, student, other_student, problem, faculty
) -> None:
    """Two students, two applications, two lines — but each one only once."""
    apply(client, student, problem)
    apply(client, other_student, problem)
    apply(client, student, problem)

    raised = [row for row in feed(client, faculty) if row["title"].startswith("New application")]
    assert len(raised) == 2


def test_a_join_request_tells_the_lead_and_not_the_asker(
    client: TestClient, db: Session, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)

    response = client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json=JOIN_MESSAGE,
        headers=auth_header(client, other_student.email),
    )

    assert response.status_code in (200, 201), response.text
    assert "Join request received" in titles(client, student)
    assert titles(client, other_student) == []


def test_answering_a_join_request_tells_the_student_who_asked(
    client: TestClient, db: Session, student, other_student, problem
) -> None:
    team_project(client, student, other_student, problem)

    answered = [
        row for row in feed(client, other_student) if row["title"] == "Join request accepted"
    ]
    assert len(answered) == 1
    assert answered[0]["kind"] == "success"


def test_submitting_a_suggestion_tells_the_nominated_mentor(
    client: TestClient, db: Session, student, faculty
) -> None:
    create_suggestion(client, student, faculty, submit=True)

    assert titles(client, faculty) == ["Suggestion awaiting your review"]
    assert titles(client, student) == []


def test_a_drafted_suggestion_tells_nobody(
    client: TestClient, db: Session, student, faculty
) -> None:
    """A draft is not an event. Only submitting nominates the mentor."""
    create_suggestion(client, student, faculty)

    assert feed(client, faculty) == []


def test_deciding_a_suggestion_tells_the_student_who_wrote_it(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "approved", "feedback": "Good idea."},
        headers=auth_header(client, faculty.email),
    )

    published = [row for row in feed(client, student) if row["title"] == "Suggestion published"]
    assert len(published) == 1
    # It points at the problem the approval created, not at the suggestion.
    assert published[0]["entity"] == "problem"


def test_a_refused_suggestion_is_not_dressed_up_as_a_publication(
    client: TestClient, db: Session, student, faculty
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "changes_requested", "feedback": "Narrow the scope."},
        headers=auth_header(client, faculty.email),
    )

    raised = feed(client, student)
    assert [row["title"] for row in raised] == ["Suggestion changes requested"]
    assert raised[0]["kind"] == "warning"
    assert raised[0]["entity"] == "problem_suggestion"


# --- idempotency ------------------------------------------------------------------


def test_the_same_event_notifies_a_person_once(
    client: TestClient, db: Session, student, institution_a
) -> None:
    """The guard is a unique constraint, not a hope that callers behave."""
    for _ in range(3):
        notifications.notify(
            db,
            user_id=student.id,
            institution_id=institution_a.id,
            kind="info",
            title="Milestone approved",
            message="Once is enough.",
            event_key="test.event:1",
        )
    db.commit()

    assert titles(client, student) == ["Milestone approved"]


def test_an_unkeyed_notification_is_never_blocked(
    client: TestClient, db: Session, student, institution_a
) -> None:
    """Null event keys are distinct in Postgres, which is why the column is
    nullable: an action with no one-shot meaning still gets through."""
    for _ in range(2):
        notifications.notify(
            db,
            user_id=student.id,
            institution_id=institution_a.id,
            kind="info",
            title="Reminder",
            message="No natural key.",
        )
    db.commit()

    assert titles(client, student) == ["Reminder", "Reminder"]


def test_a_repeated_decision_does_not_notify_twice(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The Review Engine refuses the second call; the feed shows one line."""
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    again = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    assert again.status_code == 409, again.text
    assert titles(client, student) == ["Idea approved"]


# --- read state -------------------------------------------------------------------


def test_marking_one_read_returns_the_whole_updated_feed(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    before = feed(client, student)
    assert [row["read"] for row in before] == [False] * len(before)

    response = mark_read(client, student, before[0]["id"])

    assert response.status_code == 200, response.text
    updated = response.json()["data"]
    assert len(updated) == len(before)
    assert sum(row["read"] for row in updated) == 1


def test_marking_the_same_one_read_twice_changes_nothing(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    first = feed(client, student)[0]["id"]
    mark_read(client, student, first)

    response = mark_read(client, student, first)

    assert response.status_code == 200, response.text
    assert [row["read"] for row in response.json()["data"]] == [True]


def test_marking_all_read_leaves_nothing_unread(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = awarded_team_project(client, student, other_student, faculty, problem)
    award(client, faculty, project_id)
    assert len(feed(client, student)) > 1

    response = client.post(
        "/api/v1/notifications/read-all", headers=auth_header(client, student.email)
    )

    assert response.status_code == 200, response.text
    assert all(row["read"] for row in response.json()["data"])


def test_marking_all_read_touches_nobody_elses_feed(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = awarded_team_project(client, student, other_student, faculty, problem)
    award(client, faculty, project_id)

    client.post("/api/v1/notifications/read-all", headers=auth_header(client, student.email))

    assert not any(row["read"] for row in feed(client, other_student))


# --- ownership --------------------------------------------------------------------


def test_notifying_changes_no_business_state(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    """Phase 12 observes. The award, the completion and the ledger stay the
    Credit Engine's, and are read back from it rather than from the feed."""
    project_id = awarded_team_project(client, student, other_student, faculty, problem)

    award(client, faculty, project_id)

    project = db.get(Project, uuid.UUID(project_id))
    assert project is not None
    assert project.completed_at is not None
    assert sum(row.points for row in ledger(db, student)) == TOTAL
    assert len(feed(client, student)) >= 1


def test_a_notification_carries_no_link_column(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """Routing is the frontend's. The row names the entity and stops there."""
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    row = feed(client, student)[0]

    assert set(row) == {
        "id",
        "kind",
        "title",
        "message",
        "entity",
        "entity_id",
        "read",
        "created_at",
    }
    assert row["entity_id"] == project_id


def test_an_event_in_another_college_never_reaches_this_feed(
    client: TestClient, db: Session, institution_b, student
) -> None:
    """Tenancy is enforced where the row is written, not filtered afterwards."""
    their_faculty = make_user(
        db, institution=institution_b, email="anita.rao@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(db, institution=institution_b, email="dev.mehta@other.edu")

    create_suggestion(client, their_student, their_faculty, submit=True)

    assert titles(client, their_faculty) == ["Suggestion awaiting your review"]
    assert feed(client, student) == []
