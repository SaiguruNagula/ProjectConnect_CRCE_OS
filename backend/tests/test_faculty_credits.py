"""Faculty earning: publishing a problem, reviewing a stage, mentoring to completion.

Every amount in this file comes from `credit_rules`. Nothing a mentor types —
not `base_credits`, not an evaluation, not an award — changes what they are
paid, and no event pays twice.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, UserRole
from app.modules.credits import service as credits
from app.modules.credits.models import CreditTransaction
from app.modules.problems.models import Problem
from app.modules.projects.models import Project
from tests.conftest import auth_header, make_user
from tests.test_credits import (
    AWARD,
    TOTAL,
    approved_project,
    award,
    ledger,
    team_project,
)
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_problems import VALID_PROBLEM
from tests.test_reviews import EVALUATION, FEEDBACK, decide, pending_idea, submit
from tests.test_suggestions import create_suggestion

# The Phase 5A rule table, reused as-is. Bound under its fixture name here so
# pytest finds it in this module without a second copy of the seed.
seeded_rules = _seeded_rules

PUBLISHED = "Problem Published"
REVIEW = "Faculty Review"
MENTORSHIP = "Mentorship"

# The rule points, restated so a change to the seed has to be deliberate here too.
PUBLISHED_POINTS = 10
REVIEW_POINTS = 80

# Mentorship is not a flat rule any more: the mentor is paid `MENTOR_AWARD_SHARE`
# percent of what the project was awarded, rounded down. The flat rule it
# replaced is seeded inactive and kept only so its history reads back.
SHARE_EVENT = "MENTOR_AWARD_SHARE"
SHARE_RATE = 50
FLAT_MENTORSHIP_EVENT = "MENTORED_PROJECT_COMPLETED"
FLAT_MENTORSHIP_POINTS = 60


def share_of(total: int) -> int:
    return total * SHARE_RATE // 100


def worth(total: int) -> dict[str, int]:
    """An award of exactly `total`, all of it in one component."""
    return dict.fromkeys(AWARD, 0) | {"innovation": total}


# The share of the default 250-credit award used across the faculty tests.
MENTOR_SHARE = share_of(TOTAL)


def sources(db: Session, user) -> list[tuple[str, int]]:
    return [(row.source, row.points) for row in ledger(db, user)]


def mentorships(db: Session, user) -> list[tuple[str, int]]:
    """Only the mentorship lines. Rows written in one transaction share a
    `created_at`, so position in the ledger says nothing about which is which.
    """
    return [entry for entry in sources(db, user) if entry[0] == MENTORSHIP]


def create_problem(client: TestClient, faculty, **overrides):
    return client.post(
        "/api/v1/problems",
        json=VALID_PROBLEM | overrides,
        headers=auth_header(client, faculty.email),
    )


# --- publishing a problem -----------------------------------------------------------


def test_publishing_a_problem_pays_the_rule_not_the_reward(
    client: TestClient, db: Session, faculty, seeded_rules
) -> None:
    """`base_credits` is what students may earn; the author gets the rule's points."""
    response = create_problem(client, faculty, base_credits=300)

    assert response.status_code == 201, response.text
    assert sources(db, faculty) == [(PUBLISHED, PUBLISHED_POINTS)]


def test_a_faculty_member_cannot_raise_their_own_publication_credit(
    client: TestClient, db: Session, faculty, seeded_rules
) -> None:
    """There is no payload field for it, and inflating the reward changes nothing."""
    create_problem(client, faculty, base_credits=300, title="Cheap problem")
    create_problem(client, faculty, base_credits=900, title="Expensive problem")

    assert sources(db, faculty) == [(PUBLISHED, PUBLISHED_POINTS)] * 2


def test_publishing_an_approved_suggestion_credits_the_nominated_mentor(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    decided = client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "approved", "feedback": "Good idea."},
        headers=auth_header(client, faculty.email),
    )

    assert decided.status_code == 200, decided.text
    assert sources(db, faculty) == [(PUBLISHED, PUBLISHED_POINTS)]
    # The student who suggested it is not paid for the mentor's event.
    assert sources(db, student) == []


def test_a_rejected_suggestion_credits_nobody(
    client: TestClient, db: Session, student, faculty, seeded_rules
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "rejected", "feedback": "Already solved by the timetable office."},
        headers=auth_header(client, faculty.email),
    )

    assert sources(db, faculty) == []


def test_the_same_publication_never_credits_twice(
    client: TestClient, db: Session, faculty, problem, seeded_rules
) -> None:
    """`UNIQUE(user_id, source, source_id)` is the guarantee; a repeat is a no-op."""
    first = credits.earn(
        db, faculty, event_type="PROBLEM_PUBLISHED", source_id=problem.id, description="Repeat"
    )
    second = credits.earn(
        db, faculty, event_type="PROBLEM_PUBLISHED", source_id=problem.id, description="Repeat"
    )

    assert first is not None
    assert second is None
    assert sources(db, faculty) == [(PUBLISHED, PUBLISHED_POINTS)]


def test_an_unruled_event_credits_nobody(client: TestClient, db: Session, faculty) -> None:
    """No rule row, no credit — an event the institution has not priced is free."""
    response = create_problem(client, faculty)

    assert response.status_code == 201
    assert db.query(CreditTransaction).count() == 0


def test_a_deactivated_rule_stops_paying(
    client: TestClient, db: Session, faculty, seeded_rules
) -> None:
    for rule in seeded_rules:
        if rule.event_type == "PROBLEM_PUBLISHED":
            rule.active = False
    db.flush()

    create_problem(client, faculty)

    assert sources(db, faculty) == []


# --- reviewing a stage --------------------------------------------------------------


def test_every_review_verdict_is_paid_work(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    project_id = pending_idea(client, student, problem)

    decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    assert sources(db, faculty) == [(REVIEW, REVIEW_POINTS)]


def test_re_reviewing_a_resubmitted_stage_pays_once(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The credit is keyed on the stage row, so a second look at it is not a second event."""
    project_id = pending_idea(client, student, problem)

    decide(client, faculty, project_id, SubmissionStage.IDEA, "changes", **FEEDBACK)
    submit(client, student, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    assert sources(db, faculty) == [(REVIEW, REVIEW_POINTS)]


def test_each_stage_is_its_own_review_credit(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Idea, proof of concept and final are three pieces of work."""
    approved_project(client, student, faculty, problem)

    assert sources(db, faculty) == [(REVIEW, REVIEW_POINTS)] * 3


def test_a_review_never_pays_the_student(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    approved_project(client, student, faculty, problem)

    assert sources(db, student) == []


# --- mentoring to completion --------------------------------------------------------


def test_final_approval_alone_does_not_pay_the_mentorship(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Approval is not completion (UD-1) — the award is what finishes a project."""
    project_id = approved_project(client, student, faculty, problem)

    assert MENTORSHIP not in [source for source, _ in sources(db, faculty)]
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None


def test_the_completing_award_pays_the_mentor_a_share_of_it(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Half of what the project was awarded, rather than a flat fee."""
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200
    assert mentorships(db, faculty) == [(MENTORSHIP, MENTOR_SHARE)]


def test_the_share_is_a_cut_of_the_award_not_of_what_the_team_received(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    """Every member is credited the whole award, and the mentor still gets one half.

    A bigger team is not a bigger bill: the base is `credit_awards.total`.
    """
    project_id = team_project(client, student, other_student, problem)
    for stage, decision, extra in (
        (SubmissionStage.IDEA, "approve", {}),
        (SubmissionStage.POC, "select", FEEDBACK),
        (SubmissionStage.FINAL, "approve", {"evaluation": EVALUATION}),
    ):
        submit(client, student, project_id, stage)
        decide(client, faculty, project_id, stage, decision, **extra)

    assert award(client, faculty, project_id).status_code == 200

    assert [row.points for row in ledger(db, student)] == [TOTAL]
    assert [row.points for row in ledger(db, other_student)] == [TOTAL]
    assert mentorships(db, faculty) == [(MENTORSHIP, MENTOR_SHARE)]


def test_an_odd_award_rounds_the_share_down(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """101 credits of work is a 50-credit share — never 50.5, never 51."""
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, faculty, project_id, **worth(101)).status_code == 200

    assert mentorships(db, faculty) == [(MENTORSHIP, 50)]


def test_a_revision_pays_the_difference_in_either_direction(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """The share is cumulative: what the award is worth now, less what it paid.

    A revision is a correction, not a second mentorship, and a correction can go
    down as easily as up. Nothing already written is edited.
    """
    project_id = approved_project(client, student, faculty, problem)

    for total in (100, 120, 101, 200):
        assert award(client, faculty, project_id, **worth(total)).status_code == 200

    assert mentorships(db, faculty) == [
        (MENTORSHIP, 50),  # floor(100 × 50%)
        (MENTORSHIP, 10),  # 60 owed, 50 paid
        (MENTORSHIP, -10),  # 50 owed, 60 paid
        (MENTORSHIP, 50),  # 100 owed, 50 paid
    ]
    assert sum(points for _, points in mentorships(db, faculty)) == share_of(200)


def test_replaying_an_award_does_not_pay_the_mentor_twice(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    replay = award(client, faculty, project_id)

    assert replay.status_code == 409
    assert mentorships(db, faculty) == [(MENTORSHIP, MENTOR_SHARE)]


def test_the_rate_is_the_rule_and_the_base_is_the_award(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """A mentor cannot set the percentage; only the award it applies to."""
    project_id = approved_project(client, student, faculty, problem)

    # 390 of the 400 this problem allows, against a default award of 250.
    generous = award(
        client, faculty, project_id, innovation=250, implementation=100, documentation=0
    )

    assert generous.status_code == 200, generous.text
    assert mentorships(db, faculty) == [(MENTORSHIP, share_of(390))]


def test_without_an_active_share_rule_the_mentor_is_paid_nothing(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """An unpriced event is free, never an error — the award still completes."""
    for rule in seeded_rules:
        if rule.event_type == SHARE_EVENT:
            rule.active = False
    db.flush()
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200

    assert mentorships(db, faculty) == []
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None


def test_the_flat_mentorship_rule_it_replaced_never_pays_again(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """REPLACE, not stack: the old rule has no emitter left, switched on or not."""
    for rule in seeded_rules:
        if rule.event_type == FLAT_MENTORSHIP_EVENT:
            rule.active = True
    db.flush()
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200

    assert mentorships(db, faculty) == [(MENTORSHIP, MENTOR_SHARE)]
    assert (MENTORSHIP, FLAT_MENTORSHIP_POINTS) not in mentorships(db, faculty)


def test_a_mentor_at_another_college_is_never_the_recipient(
    client: TestClient, db: Session, institution_b, student, faculty, problem, seeded_rules
) -> None:
    """The share follows `projects.mentor_id`, and the project is not theirs to award."""
    outsider = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, outsider, project_id).status_code == 404

    assert ledger(db, outsider) == []
    assert mentorships(db, faculty) == []


# --- one transaction ----------------------------------------------------------------


def test_a_publication_whose_credit_fails_publishes_nothing(
    client: TestClient, db: Session, monkeypatch, faculty, seeded_rules
) -> None:
    """The problem, its ledger line and its audit share the caller's transaction."""

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(credits, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        create_problem(client, faculty)
    db.rollback()

    assert db.query(Problem).filter_by(title=VALID_PROBLEM["title"]).count() == 0
    assert db.query(CreditTransaction).count() == 0


def test_a_review_whose_credit_fails_leaves_the_stage_pending(
    client: TestClient, db: Session, monkeypatch, student, faculty, problem, seeded_rules
) -> None:
    project_id = pending_idea(client, student, problem)

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(credits, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    db.rollback()

    assert db.query(CreditTransaction).count() == 0
    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]
    assert [item["id"] for item in queues["idea"]] == [project_id]


# --- tenancy ------------------------------------------------------------------------


def test_a_credit_is_written_against_the_earners_own_institution(
    client: TestClient, db: Session, institution_b, seeded_rules
) -> None:
    """The rules are shared; the ledger row belongs to the college the author is in."""
    outsider = make_user(
        db, institution=institution_b, email="other.faculty@other.edu", role=UserRole.FACULTY
    )

    assert create_problem(client, outsider).status_code == 201

    assert [row.institution_id for row in ledger(db, outsider)] == [institution_b.id]
