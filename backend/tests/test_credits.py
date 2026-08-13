"""The Credit Engine: awarding, revising, publication and the ledger reads."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, UserRole
from app.modules.credits import service as credits
from app.modules.credits.models import CreditAward, CreditRule, CreditTransaction
from app.modules.credits.schemas import CreditAwardIn
from app.modules.projects.models import Project
from tests.conftest import auth_header, make_problem, make_user
from tests.test_reviews import (
    EVALUATION,
    FEEDBACK,
    audit_actions,
    decide,
    selected_project,
    submit,
)
from tests.test_teams import create_team

# 250 credits, under the 400 ceiling a 200-credit problem allows.
AWARD = {
    "innovation": 80,
    "implementation": 90,
    "documentation": 40,
    "presentation": 30,
    "bonus": 10,
}
TOTAL = sum(AWARD.values())

# The V1 rules the migration seeds. Tests build their schema from the models,
# so the rows are inserted here instead — see the phase 5a migration.
SEEDED_RULES = (
    (UserRole.STUDENT, "PROJECT_COMPLETION", 300),
    (UserRole.FACULTY, "REVIEW_COMPLETED", 80),
    (UserRole.FACULTY, "MENTORED_PROJECT_COMPLETED", 60),
    (UserRole.FACULTY, "PROBLEM_PUBLISHED", 10),
)


@pytest.fixture
def seeded_rules(db: Session) -> list[CreditRule]:
    rows = [
        CreditRule(
            role=role,
            event_type=event,
            points=points,
            description=f"{event} is worth {points} credits.",
        )
        for role, event, points in SEEDED_RULES
    ]
    db.add_all(rows)
    db.flush()
    return rows


def approved_project(client: TestClient, student, faculty, problem) -> str:
    """A project whose final stage has passed review — credit-eligible, uncredited."""
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)
    response = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )
    assert response.status_code == 200, response.text
    return project_id


def award(client: TestClient, faculty, project_id: str, **overrides):
    return client.post(
        f"/api/v1/projects/{project_id}/credits",
        json=AWARD | overrides,
        headers=auth_header(client, faculty.email),
    )


def publish(client: TestClient, faculty, project_id: str, publish: bool = True):
    return client.post(
        f"/api/v1/projects/{project_id}/publication",
        json={"publish": publish},
        headers=auth_header(client, faculty.email),
    )


def ledger(db: Session, user) -> list[CreditTransaction]:
    return (
        db.query(CreditTransaction)
        .filter_by(user_id=user.id)
        .order_by(CreditTransaction.created_at, CreditTransaction.points)
        .all()
    )


def team_project(client: TestClient, lead, member, problem) -> str:
    """A two-person team that has applied — one project, two recipients."""
    team = create_team(client, lead, problem)
    lead_headers = auth_header(client, lead.email)
    client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json={"message": "I have shipped two computer-vision projects already."},
        headers=auth_header(client, member.email),
    )
    pending = client.get("/api/v1/teams/mine/join-requests", headers=lead_headers).json()["data"]
    client.post(f"/api/v1/teams/join-requests/{pending[0]['id']}/accept", headers=lead_headers)
    response = client.post(
        f"/api/v1/problems/{problem.id}/applications",
        json={
            "idea_summary": "Face recognition that runs entirely on the classroom device.",
            "approach": "Train a small model, then deploy it to a Raspberry Pi at the door.",
            "team_id": team["id"],
        },
        headers=lead_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["id"]


# --- authorization ---------------------------------------------------------------


def test_the_credit_engine_is_closed_to_anonymous_callers(client: TestClient) -> None:
    missing = uuid.uuid4()

    posted = client.post(f"/api/v1/projects/{missing}/credits", json=AWARD)
    published = client.post(f"/api/v1/projects/{missing}/publication", json={"publish": True})

    assert posted.status_code == 401
    assert posted.json()["error_code"] == "UNAUTHENTICATED"
    assert published.status_code == 401
    for path in ("summary", "history", "me", "rules", "categories", "pipeline"):
        assert client.get(f"/api/v1/credits/{path}").status_code == 401


def test_students_do_not_award_credits(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    response = award(client, student, project_id)

    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"
    assert db.query(CreditAward).count() == 0


def test_only_the_assigned_mentor_awards_credits(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    project_id = approved_project(client, student, faculty, problem)

    response = award(client, colleague, project_id)

    assert response.status_code == 403
    assert response.json()["message"] == (
        "Only the assigned mentor can award credits for this project."
    )
    assert db.query(CreditTransaction).count() == 0


def test_another_colleges_project_cannot_be_credited(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    outsider = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )
    project_id = approved_project(client, student, faculty, problem)

    credited = award(client, outsider, project_id)
    published = publish(client, outsider, project_id)

    assert credited.status_code == 404
    assert credited.json()["error_code"] == "NOT_FOUND"
    assert published.status_code == 404


def test_an_unknown_project_is_404(client: TestClient, faculty) -> None:
    assert award(client, faculty, str(uuid.uuid4())).status_code == 404


def test_a_mentor_never_credits_themselves(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The roster is the recipient list, and a mentor is not on it."""
    project_id = approved_project(client, student, faculty, problem)

    assert award(client, faculty, project_id).status_code == 200

    assert [row.user_id for row in db.query(CreditTransaction).all()] == [student.id]
    assert client.get(
        "/api/v1/credits/summary", headers=auth_header(client, faculty.email)
    ).json()["data"]["total"] == 0


# --- preconditions ----------------------------------------------------------------


def test_credits_wait_for_an_approved_final_project(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)

    response = award(client, faculty, project_id)

    assert response.status_code == 409
    assert response.json()["message"] == "Approve the final project before awarding credits."
    assert db.query(CreditAward).count() == 0


@pytest.mark.parametrize("decision", ["changes", "reject"])
def test_a_final_project_that_did_not_pass_earns_nothing(
    client: TestClient, student, faculty, problem, decision
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)
    decide(client, faculty, project_id, SubmissionStage.FINAL, decision, **FEEDBACK)

    response = award(client, faculty, project_id)

    assert response.status_code == 409
    assert response.json()["error_code"] == "BUSINESS_RULE_VIOLATION"


def test_a_negative_component_is_refused(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    response = award(client, faculty, project_id, bonus=-10)

    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"
    assert response.json()["errors"][0]["field"] == "bonus"
    assert db.query(CreditAward).count() == 0


def test_an_award_of_nothing_is_refused(client: TestClient, student, faculty, problem) -> None:
    project_id = approved_project(client, student, faculty, problem)

    response = award(client, faculty, project_id, **dict.fromkeys(AWARD, 0))

    assert response.status_code == 422
    assert response.json()["message"] == "Award at least one credit."
    assert response.json()["errors"][0]["field"] == "total"


def test_an_award_cannot_exceed_what_the_problem_is_worth(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """UD-11: the ceiling is twice `problems.base_credits`, checked on the total."""
    project_id = approved_project(client, student, faculty, problem)

    at_ceiling = award(client, faculty, project_id, innovation=200, implementation=200)
    assert at_ceiling.status_code == 409
    assert at_ceiling.json()["message"] == "This project is worth at most 400 credits."

    assert award(client, faculty, project_id, innovation=190, implementation=100).status_code == 200
    assert db.query(CreditAward).one().total == 190 + 100 + 40 + 30 + 10


def test_the_award_takes_no_fields_of_its_own(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    total = award(client, faculty, project_id, total=9999)
    recipients = award(client, faculty, project_id, recipients=[str(student.id)])

    assert total.status_code == 422
    assert recipients.status_code == 422


# --- awarding ----------------------------------------------------------------------


def test_awarding_credits_completes_the_project(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """UD-1: approval makes a project eligible; the credits complete it."""
    project_id = approved_project(client, student, faculty, problem)
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None

    response = award(client, faculty, project_id)

    assert response.status_code == 200
    assert response.json()["message"] == "Credits awarded."
    journey = response.json()["data"]
    assert journey["status"] == "completed"
    assert journey["credits"]["total"] == TOTAL
    assert journey["credits"]["bonus"] == AWARD["bonus"]
    assert journey["credits"]["awarded_by"] == faculty.name
    assert db.get(Project, uuid.UUID(project_id)).completed_at is not None
    assert "credit.awarded" in audit_actions(db)


def test_the_database_computes_the_total(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    award(client, faculty, project_id)

    row = db.query(CreditAward).one()
    assert row.total == TOTAL
    assert row.project_id == uuid.UUID(project_id)
    assert row.awarded_by == faculty.id
    assert row.previous_award_id is None
    assert row.superseded_at is None


def test_a_solo_project_credits_the_student_who_built_it(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    award(client, faculty, project_id)

    line = db.query(CreditTransaction).one()
    assert line.user_id == student.id
    assert line.points == TOTAL
    assert line.source == "Project Completion"
    assert line.source_id == db.query(CreditAward).one().id
    assert line.description == problem.title
    assert line.context == f"Dept. of {problem.department}"
    assert line.institution_id == student.institution_id


def test_every_member_of_the_team_is_credited(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    project_id = team_project(client, student, other_student, problem)
    submit(client, student, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    submit(client, student, project_id, SubmissionStage.FINAL)
    decide(client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION)

    assert award(client, faculty, project_id).status_code == 200

    lines = db.query(CreditTransaction).all()
    assert len(lines) == 2
    assert {line.user_id for line in lines} == {student.id, other_student.id}
    assert {line.points for line in lines} == {TOTAL}
    # One award, two ledger lines — never one line holding a list of people.
    assert {line.source_id for line in lines} == {db.query(CreditAward).one().id}


def test_a_third_party_is_never_credited(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    bystander = make_user(db, institution=institution_a, email="rhea.dsouza@crce.edu")
    project_id = approved_project(client, student, faculty, problem)

    award(client, faculty, project_id)

    assert ledger(db, bystander) == []
    assert client.get(
        "/api/v1/credits/summary", headers=auth_header(client, bystander.email)
    ).json()["data"]["total"] == 0


# --- revision -----------------------------------------------------------------------


def test_the_same_award_twice_is_refused(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    again = award(client, faculty, project_id)

    assert again.status_code == 409
    assert again.json()["message"] == "These credits are already recorded."
    assert db.query(CreditAward).count() == 1
    assert db.query(CreditTransaction).count() == 1


def test_a_revision_supersedes_the_previous_award(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    first = db.query(CreditAward).one()

    response = award(client, faculty, project_id, bonus=60)

    assert response.status_code == 200
    assert response.json()["data"]["credits"]["total"] == TOTAL + 50
    db.refresh(first)
    live = db.query(CreditAward).filter_by(superseded_at=None).one()
    assert first.superseded_at is not None
    assert live.previous_award_id == first.id
    assert live.total == TOTAL + 50
    assert db.query(CreditAward).count() == 2
    assert "credit.revised" in audit_actions(db)


def test_a_revision_posts_only_the_difference(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    award(client, faculty, project_id, bonus=60)

    assert [line.points for line in ledger(db, student)] == [TOTAL, 50]
    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]
    assert summary["total"] == TOTAL + 50


def test_a_correction_downwards_posts_a_negative_line(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    award(client, faculty, project_id, bonus=0, presentation=0)

    assert [line.points for line in ledger(db, student)] == [TOTAL, -40]
    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]
    # The correction reduces what is held; it does not rewrite what was earned.
    assert summary["current"] == TOTAL - 40
    assert summary["lifetime"] == TOTAL


def test_a_revision_never_edits_the_original_ledger_line(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    original = db.query(CreditTransaction).one()
    original_id, original_source = original.id, original.source_id

    award(client, faculty, project_id, bonus=60)

    db.refresh(original)
    assert original.id == original_id
    assert original.points == TOTAL
    # Each line names the award that produced it, so a correction is traceable.
    assert original.source_id == original_source
    correction = db.query(CreditTransaction).filter(CreditTransaction.id != original_id).one()
    assert correction.source_id != original_source
    assert correction.source_id == db.query(CreditAward).filter_by(superseded_at=None).one().id


def test_a_revision_keeps_the_day_the_work_finished(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    completed_at = db.get(Project, uuid.UUID(project_id)).completed_at

    award(client, faculty, project_id, bonus=60)

    project = db.get(Project, uuid.UUID(project_id))
    db.refresh(project)
    assert project.completed_at == completed_at


def test_the_database_allows_one_live_award_per_project(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    db.add(
        CreditAward(
            project_id=uuid.UUID(project_id),
            innovation=1,
            implementation=0,
            documentation=0,
            presentation=0,
            bonus=0,
            awarded_by=faculty.id,
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# --- one transaction ----------------------------------------------------------------


def test_an_award_that_fails_halfway_leaves_nothing_behind(
    client: TestClient, db: Session, monkeypatch, student, faculty, problem
) -> None:
    """The award, every ledger line, the completion and the audit share one transaction."""
    project_id = approved_project(client, student, faculty, problem)

    def flaky(session, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(credits, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        credits.award(db, faculty, uuid.UUID(project_id), CreditAwardIn(**AWARD))
    db.rollback()

    assert db.query(CreditAward).count() == 0
    assert db.query(CreditTransaction).count() == 0
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None


# --- reads ---------------------------------------------------------------------------


def test_the_summary_is_the_sum_of_the_ledger(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]

    assert summary["engine_version"] == "V1.0"
    assert summary["total"] == summary["current"] == summary["lifetime"] == TOTAL
    assert summary["level"] == 3
    assert summary["level_name"] == "Builder"
    assert summary["next_level_name"] == "Innovator"
    assert summary["next_milestone"] == 300
    assert summary["credits_to_next"] == 50
    assert summary["pct_to_next"] == 83
    assert summary["locked"] == 0


def test_the_history_is_the_callers_own_ledger_newest_first(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    second_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Water Reuse"
    )
    for target in (problem, second_problem):
        award(client, faculty, approved_project(client, student, faculty, target))

    history = client.get(
        "/api/v1/credits/history", headers=auth_header(client, student.email)
    ).json()["data"]

    assert [line["description"] for line in history] == [second_problem.title, problem.title]
    assert history[0]["points"] == TOTAL
    assert history[0]["source"] == "Project Completion"
    assert history[0]["date"] >= history[1]["date"]


def test_no_one_reads_another_students_ledger(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    award(client, faculty, approved_project(client, student, faculty, problem))

    theirs = client.get(
        "/api/v1/credits/history", headers=auth_header(client, other_student.email)
    ).json()["data"]

    assert theirs == []
    # There is no route that takes a user id, so there is nothing else to try.
    assert client.get(
        f"/api/v1/credits/history?user_id={student.id}",
        headers=auth_header(client, other_student.email),
    ).json()["data"] == []


def test_the_breakdown_groups_the_ledger_by_source(
    client: TestClient, student, faculty, problem
) -> None:
    award(client, faculty, approved_project(client, student, faculty, problem))

    breakdown = client.get(
        "/api/v1/credits/me", headers=auth_header(client, student.email)
    ).json()["data"]

    assert breakdown == [{"label": "Project Completion", "value": TOTAL}]


def test_the_categories_carry_the_icon_the_cards_render(
    client: TestClient, student, faculty, problem
) -> None:
    award(client, faculty, approved_project(client, student, faculty, problem))

    categories = client.get(
        "/api/v1/credits/categories", headers=auth_header(client, student.email)
    ).json()["data"]

    assert categories == [{"label": "Projects", "value": TOTAL, "icon": "code"}]


def test_the_rules_are_configuration_rows_not_code(
    client: TestClient, seeded_rules, student
) -> None:
    rules = client.get(
        "/api/v1/credits/rules", headers=auth_header(client, student.email)
    ).json()["data"]

    assert [rule["points"] for rule in rules] == [300, 80, 60, 10]
    assert [rule["source"] for rule in rules] == [
        "Project Completion",
        "Faculty Review",
        "Mentorship",
        "Problem Published",
    ]


def test_the_pipeline_is_what_is_still_with_faculty(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)
    headers = auth_header(client, student.email)

    pipeline = client.get("/api/v1/credits/pipeline", headers=headers).json()["data"]

    assert len(pipeline) == 1
    assert pipeline[0]["title"] == problem.title
    assert pipeline[0]["status"] == "In Review"
    assert pipeline[0]["detail"] == "Final project — faculty review pending"
    # Potential comes from the problem, not from a guess.
    assert pipeline[0]["potential"] == problem.base_credits
    assert client.get("/api/v1/credits/summary", headers=headers).json()["data"]["pending"] == (
        problem.base_credits
    )


def test_a_decided_submission_leaves_the_pipeline(
    client: TestClient, student, faculty, problem
) -> None:
    award(client, faculty, approved_project(client, student, faculty, problem))
    headers = auth_header(client, student.email)

    pipeline = client.get("/api/v1/credits/pipeline", headers=headers).json()["data"]

    assert pipeline == []
    assert client.get("/api/v1/credits/summary", headers=headers).json()["data"]["pending"] == 0


def test_faculty_read_the_same_ledger_routes(client: TestClient, seeded_rules, faculty) -> None:
    """One engine, one set of routes — nobody gets a private copy (ADR-5)."""
    headers = auth_header(client, faculty.email)

    summary = client.get("/api/v1/credits/summary", headers=headers)
    pipeline = client.get("/api/v1/credits/pipeline", headers=headers)
    rules = client.get("/api/v1/credits/rules", headers=headers)

    assert summary.status_code == 200
    assert summary.json()["data"]["total"] == 0
    assert summary.json()["data"]["level_name"] == "Newcomer"
    # Faculty earn from rules, not from submissions.
    assert pipeline.json()["data"] == []
    assert len(rules.json()["data"]) == len(SEEDED_RULES)


# --- publication ----------------------------------------------------------------------


def test_publishing_an_approved_project(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    response = publish(client, faculty, project_id)

    assert response.status_code == 200
    assert response.json()["message"] == "Published to the Solutions Hub."
    assert response.json()["data"]["published"] is True
    assert db.get(Project, uuid.UUID(project_id)).published is True
    assert "project.published" in audit_actions(db)


def test_publication_can_be_taken_back(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    publish(client, faculty, project_id)

    response = publish(client, faculty, project_id, publish=False)

    assert response.json()["data"]["published"] is False
    assert response.json()["message"] == "Publication removed."
    assert db.get(Project, uuid.UUID(project_id)).published is False
    assert "project.unpublished" in audit_actions(db)


def test_only_an_approved_final_project_is_published(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)

    response = publish(client, faculty, project_id)

    assert response.status_code == 409
    assert response.json()["message"] == "Only an approved final project can be published."


def test_only_the_mentor_publishes(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    project_id = approved_project(client, student, faculty, problem)

    assert publish(client, colleague, project_id).status_code == 403
    assert publish(client, student, project_id).status_code == 403
    assert db.get(Project, uuid.UUID(project_id)).published is False


def test_publishing_awards_nothing(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """Publication is a flag; only an award moves credits or completes a project."""
    project_id = approved_project(client, student, faculty, problem)

    journey = publish(client, faculty, project_id).json()["data"]

    assert journey["status"] == "approved"
    assert journey["credits"] is None
    assert db.query(CreditTransaction).count() == 0
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None
