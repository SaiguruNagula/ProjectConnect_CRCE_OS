"""The review engine: queues, decisions and everything they settle."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SelectionStatus, SubmissionStage, SubmissionStatus, UserRole
from app.modules.projects.models import Project, StageSubmission
from app.modules.reviews import service as reviews
from app.modules.reviews.schemas import ReviewDecisionIn
from tests.conftest import auth_header, make_problem, make_user
from tests.test_applications import IDEA
from tests.test_projects import FINAL, POC, open_project

FEEDBACK = {
    "strengths": "The framing is clear and the scope is honest.",
    "weaknesses": "The evaluation plan is thin.",
    "suggestions": "Add a baseline to compare against.",
    "comments": "Come back once the baseline is in.",
}

EVALUATION = {
    "innovation": 8,
    "technical_quality": 7,
    "implementation": 9,
    "documentation": 6,
    "presentation": 7,
    "overall_remarks": "Running in two lecture halls every weekday.",
}

STAGE_PATH = {
    SubmissionStage.IDEA: "idea",
    SubmissionStage.POC: "proof-of-concept",
    SubmissionStage.FINAL: "final",
}


def submit(client: TestClient, student, project_id: str, stage: SubmissionStage) -> None:
    payload = {SubmissionStage.IDEA: IDEA, SubmissionStage.POC: POC, SubmissionStage.FINAL: FINAL}
    response = client.put(
        f"/api/v1/projects/{project_id}/{STAGE_PATH[stage]}?submit=true",
        json=payload[stage],
        headers=auth_header(client, student.email),
    )
    assert response.status_code == 200, response.text


def decide(
    client: TestClient,
    faculty,
    project_id: str,
    stage: SubmissionStage,
    decision: str,
    **body,
):
    return client.post(
        f"/api/v1/reviews/{project_id}/{stage.value}",
        json={"decision": decision, **body},
        headers=auth_header(client, faculty.email),
    )


def pending_idea(client: TestClient, student, problem) -> str:
    """A project whose idea is sitting in the mentor's queue."""
    project_id = open_project(client, student, problem)
    submit(client, student, project_id, SubmissionStage.IDEA)
    return project_id


def selected_project(client: TestClient, student, faculty, problem) -> str:
    """A project carried all the way to an unlocked final stage."""
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)
    return project_id


def audit_actions(db: Session) -> list[str]:
    from app.common.audit import AuditLog

    return [row.action for row in db.query(AuditLog).all()]


# --- authorization ---------------------------------------------------------------


def test_the_review_engine_is_closed_to_anonymous_callers(client: TestClient) -> None:
    missing = uuid.uuid4()

    assert client.get("/api/v1/reviews/queues").status_code == 401
    assert client.get(f"/api/v1/reviews/{missing}").status_code == 401
    posted = client.post(f"/api/v1/reviews/{missing}/idea", json={"decision": "approve"})
    assert posted.status_code == 401
    assert posted.json()["error_code"] == "UNAUTHENTICATED"


def test_students_have_no_review_verbs(client: TestClient, student, faculty, problem) -> None:
    project_id = pending_idea(client, student, problem)
    headers = auth_header(client, student.email)

    queues = client.get("/api/v1/reviews/queues", headers=headers)
    detail = client.get(f"/api/v1/reviews/{project_id}", headers=headers)
    approve = decide(client, student, project_id, SubmissionStage.IDEA, "approve")

    assert queues.status_code == 403
    assert detail.status_code == 403
    assert approve.status_code == 403
    assert approve.json()["error_code"] == "FORBIDDEN"


def test_a_student_cannot_approve_their_own_submission(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    assert decide(client, student, project_id, SubmissionStage.IDEA, "approve").status_code == 403

    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.status is SubmissionStatus.SUBMITTED
    assert row.reviewed_by is None


def test_only_the_assigned_mentor_reviews(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    project_id = pending_idea(client, student, problem)

    detail = client.get(
        f"/api/v1/reviews/{project_id}", headers=auth_header(client, colleague.email)
    )
    approve = decide(client, colleague, project_id, SubmissionStage.IDEA, "approve")
    mentor_view = client.get(
        f"/api/v1/reviews/{project_id}", headers=auth_header(client, faculty.email)
    )

    assert detail.status_code == 403
    assert approve.status_code == 403
    assert mentor_view.status_code == 200
    assert mentor_view.json()["data"]["project_id"] == project_id
    assert client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, colleague.email)
    ).json()["data"]["idea"] == []


def test_another_colleges_project_cannot_be_reviewed(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    outsider = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )
    project_id = pending_idea(client, student, problem)

    detail = client.get(
        f"/api/v1/reviews/{project_id}", headers=auth_header(client, outsider.email)
    )
    approve = decide(client, outsider, project_id, SubmissionStage.IDEA, "approve")

    assert detail.status_code == 404
    assert detail.json()["error_code"] == "NOT_FOUND"
    assert approve.status_code == 404


def test_an_unknown_project_is_404(client: TestClient, faculty) -> None:
    response = client.get(
        f"/api/v1/reviews/{uuid.uuid4()}", headers=auth_header(client, faculty.email)
    )

    assert response.status_code == 404


# --- queues ----------------------------------------------------------------------


def test_a_submitted_idea_waits_in_the_idea_queue(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["idea"]] == [project_id]
    assert queues["poc"] == queues["final"] == queues["completed"] == []
    card = queues["idea"][0]
    assert card["project_title"] == problem.title
    assert card["problem_title"] == problem.title
    assert card["team_name"] == "Individual entry"
    assert card["stage"] == "idea"
    assert card["status"] == "idea_submitted"
    assert card["mentor_name"] == faculty.name
    assert card["submitted_at"]
    assert card["last_reviewed_stage"] is None
    assert [member["id"] for member in card["members"]] == [str(student.id)]


def test_applying_alone_puts_nothing_in_the_queue(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The queue carries submitted work only.

    Applying opens the project with the idea still in draft (ADR-1), and the
    mentor is already assigned — so it is tempting to read an empty queue as a
    broken link between the two modules. It is not: the student has written
    nothing yet. Submitting the idea is what makes it a review.
    """
    project_id = open_project(client, student, problem)
    headers = auth_header(client, faculty.email)

    queues = client.get("/api/v1/reviews/queues", headers=headers).json()["data"]
    assert queues["idea"] == queues["poc"] == queues["final"] == queues["completed"] == []

    submit(client, student, project_id, SubmissionStage.IDEA)

    after = client.get("/api/v1/reviews/queues", headers=headers).json()["data"]
    assert [item["id"] for item in after["idea"]] == [project_id]


def test_applying_assigns_the_problems_author_as_mentor(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """Without this the submitted idea would land in nobody's queue (ADR-3)."""
    project_id = open_project(client, student, problem)

    project = db.get(Project, uuid.UUID(project_id))
    assert project is not None
    assert project.mentor_id == problem.created_by == faculty.id


def test_each_stage_waits_in_its_own_queue(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    headers = auth_header(client, faculty.email)

    poc_queue = client.get("/api/v1/reviews/queues", headers=headers).json()["data"]
    submit(client, student, project_id, SubmissionStage.FINAL)
    final_queue = client.get("/api/v1/reviews/queues", headers=headers).json()["data"]

    # Selecting settles the PoC, so nothing is pending until final is submitted.
    assert poc_queue["poc"] == []
    assert [item["id"] for item in final_queue["final"]] == [project_id]
    assert final_queue["final"][0]["last_reviewed_stage"] == "poc"
    assert final_queue["final"][0]["attachment_count"] == 1


def test_the_furthest_pending_stage_owns_the_project(
    client: TestClient, student, faculty, problem
) -> None:
    """A team may run ahead: the idea and the PoC can both be waiting."""
    project_id = pending_idea(client, student, problem)
    submit(client, student, project_id, SubmissionStage.POC)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert queues["idea"] == []
    assert [item["id"] for item in queues["poc"]] == [project_id]


def test_finished_projects_move_to_the_completed_queue(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)
    decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["completed"]] == [project_id]
    # Approved, not completed: completion waits for the credits (UD-1).
    assert queues["completed"][0]["status"] == "approved"
    assert queues["completed"][0]["stage"] == "final"


def test_a_rejected_project_is_completed_work(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["completed"]] == [project_id]
    assert queues["completed"][0]["status"] == "rejected"


def test_a_queue_holds_only_the_mentors_own_projects(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    colleague = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    theirs = make_problem(
        db, institution=institution_a, author=colleague, title="Water Reuse"
    )
    mine = pending_idea(client, student, problem)
    pending_idea(client, other_student, theirs)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["idea"]] == [mine]


def test_queues_never_cross_the_institution_boundary(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    outsider = make_user(
        db, institution=institution_b, email="rao@other.edu", role=UserRole.FACULTY
    )
    theirs = make_problem(db, institution=institution_b, author=outsider, title="Theirs")
    their_student = make_user(db, institution=institution_b, email="kiran@other.edu")
    pending_idea(client, student, problem)
    pending_idea(client, their_student, theirs)

    mine = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert len(mine["idea"]) == 1
    assert mine["idea"][0]["problem_title"] == problem.title


def test_the_team_that_waited_longest_comes_first(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    first = pending_idea(client, student, problem)
    second = pending_idea(client, other_student, problem)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["idea"]] == [first, second]


# --- approving -------------------------------------------------------------------


def test_approving_an_idea_unlocks_the_proof_of_concept(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    response = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    assert response.status_code == 200
    assert response.json()["message"] == "Decision recorded."
    journey = response.json()["data"]
    assert journey["idea"]["status"] == "approved"
    assert journey["idea"]["review"]["reviewed_by"] == faculty.name
    assert journey["idea"]["reviewed_at"]
    assert journey["status"] == "idea_approved"
    assert journey["unlocked_stages"] == ["idea", "poc"]
    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    assert row.reviewed_by == faculty.id
    assert "review.stage_approved" in audit_actions(db)


def test_approval_needs_no_feedback_before_the_final_stage(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)

    response = decide(client, faculty, project_id, SubmissionStage.POC, "approve")

    assert response.status_code == 200
    assert response.json()["data"]["poc"]["status"] == "approved"
    # Approving a PoC is not selecting a team — Stage 3 stays open.
    assert response.json()["data"]["selection"]["status"] == "not_reviewed"


def test_approving_the_final_project_makes_it_credit_eligible(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """Approval is not completion — the credit award completes a project (UD-1)."""
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)

    journey = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    ).json()["data"]

    assert journey["final"]["status"] == "approved"
    assert journey["status"] == "approved"
    assert journey["final"]["review"]["evaluation"] == EVALUATION
    assert journey["timeline"][-1]["done"] is True
    assert db.get(Project, uuid.UUID(project_id)).completed_at is None


def test_a_final_project_is_never_approved_unscored(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)

    unscored = decide(client, faculty, project_id, SubmissionStage.FINAL, "approve")
    unremarked = decide(
        client,
        faculty,
        project_id,
        SubmissionStage.FINAL,
        "approve",
        evaluation=EVALUATION | {"overall_remarks": "   "},
    )

    assert unscored.status_code == 422
    assert unscored.json()["errors"][0]["field"] == "evaluation"
    assert unremarked.status_code == 422
    assert unremarked.json()["errors"][0]["field"] == "evaluation.overall_remarks"


def test_a_decided_stage_is_not_decided_twice(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    again = decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    assert again.status_code == 409
    assert again.json()["message"] == "This stage has already been decided."


def test_a_stage_that_was_never_submitted_cannot_be_reviewed(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = open_project(client, student, problem)

    draft = decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    absent = decide(client, faculty, project_id, SubmissionStage.POC, "approve")

    assert draft.status_code == 409
    assert draft.json()["message"] == "This submission is not waiting for a review."
    assert absent.status_code == 409


# --- selecting -------------------------------------------------------------------


def test_selecting_a_team_settles_the_poc_and_opens_final(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)

    journey = decide(
        client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK
    ).json()["data"]

    assert journey["poc"]["status"] == "approved"
    assert journey["selection"]["status"] == "selected"
    assert journey["selection"]["feedback"] == FEEDBACK["comments"]
    assert journey["selection"]["decided_by"] == faculty.name
    assert journey["selection"]["decided_at"]
    assert journey["unlocked_stages"] == ["idea", "poc", "selection", "final"]
    assert journey["status"] == "selected_for_final"
    project = db.get(Project, uuid.UUID(project_id))
    assert project.selection_decided_by == faculty.id
    assert "review.team_selected" in audit_actions(db)


def test_selection_belongs_to_the_proof_of_concept_alone(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    response = decide(client, faculty, project_id, SubmissionStage.IDEA, "select", **FEEDBACK)

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "decision"


def test_a_team_is_selected_only_once(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = selected_project(client, student, faculty, problem)

    again = decide(client, faculty, project_id, SubmissionStage.POC, "select", **FEEDBACK)

    assert again.status_code == 409


def test_rejecting_the_poc_ends_the_run(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)

    journey = decide(
        client, faculty, project_id, SubmissionStage.POC, "reject", **FEEDBACK
    ).json()["data"]

    assert journey["poc"]["status"] == "rejected"
    assert journey["selection"]["status"] == "not_selected"
    assert journey["selection"]["feedback"] == FEEDBACK["weaknesses"]
    assert "final" not in journey["unlocked_stages"]
    assert "review.team_not_selected" in audit_actions(db)


# --- requesting changes ----------------------------------------------------------


def test_requesting_changes_hands_the_stage_back(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    journey = decide(
        client, faculty, project_id, SubmissionStage.IDEA, "changes", **FEEDBACK
    ).json()["data"]

    assert journey["idea"]["status"] == "changes_requested"
    assert journey["idea"]["review"]["weaknesses"] == FEEDBACK["weaknesses"]
    assert journey["idea"]["review"]["suggestions"] == FEEDBACK["suggestions"]
    assert journey["status"] == "changes_requested"
    assert "review.stage_changes_requested" in audit_actions(db)


def test_the_frontends_decision_literal_is_accepted(
    client: TestClient, student, faculty, problem
) -> None:
    """domain.ts posts `changes_requested`; this spec calls it `changes`."""
    project_id = pending_idea(client, student, problem)

    journey = decide(
        client, faculty, project_id, SubmissionStage.IDEA, "changes_requested", **FEEDBACK
    ).json()["data"]

    assert journey["idea"]["status"] == "changes_requested"


@pytest.mark.parametrize("decision", ["changes", "reject"])
def test_a_negative_decision_must_say_why(
    client: TestClient, student, faculty, problem, decision
) -> None:
    project_id = pending_idea(client, student, problem)

    silent = decide(client, faculty, project_id, SubmissionStage.IDEA, decision)
    blank = decide(
        client, faculty, project_id, SubmissionStage.IDEA, decision, comments="   "
    )

    assert silent.status_code == 422
    assert silent.json()["message"] == (
        "Explain the decision so the team knows what to do next."
    )
    assert blank.status_code == 422


# --- rejection is terminal --------------------------------------------------------


def test_a_rejected_stage_is_never_resubmitted(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)

    response = client.put(
        f"/api/v1/projects/{project_id}/idea?submit=true",
        json=IDEA,
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 409
    assert response.json()["message"] == (
        "Your idea was rejected and cannot be resubmitted."
    )


def test_an_approved_stage_is_settled(client: TestClient, student, faculty, problem) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")

    response = client.put(
        f"/api/v1/projects/{project_id}/idea",
        json=IDEA,
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 409
    assert response.json()["message"] == "Your idea has already been approved."


# --- evaluation -------------------------------------------------------------------


@pytest.mark.parametrize("stage", [SubmissionStage.IDEA, SubmissionStage.POC])
def test_only_a_final_project_is_scored(
    client: TestClient, student, faculty, problem, stage
) -> None:
    project_id = pending_idea(client, student, problem)
    if stage is SubmissionStage.POC:
        decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
        submit(client, student, project_id, SubmissionStage.POC)

    response = decide(client, faculty, project_id, stage, "approve", evaluation=EVALUATION)

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "evaluation"


@pytest.mark.parametrize("score", [-1, 11])
def test_scores_stay_inside_the_rubric(
    client: TestClient, student, faculty, problem, score
) -> None:
    project_id = selected_project(client, student, faculty, problem)
    submit(client, student, project_id, SubmissionStage.FINAL)

    response = decide(
        client,
        faculty,
        project_id,
        SubmissionStage.FINAL,
        "approve",
        evaluation=EVALUATION | {"innovation": score},
    )

    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"
    assert response.json()["errors"][0]["field"] == "evaluation.innovation"


def test_unknown_review_fields_are_refused(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    response = decide(
        client, faculty, project_id, SubmissionStage.IDEA, "approve", reviewed_by="someone"
    )

    assert response.status_code == 422


# --- resubmission ------------------------------------------------------------------


def test_resubmitting_replaces_the_previous_review(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "changes", **FEEDBACK)
    first = db.query(StageSubmission).filter_by(project_id=project_id).one().submitted_at

    submit(client, student, project_id, SubmissionStage.IDEA)

    journey = client.get(
        f"/api/v1/projects/{project_id}/journey",
        headers=auth_header(client, student.email),
    ).json()["data"]
    assert journey["idea"]["status"] == "submitted"
    assert journey["idea"]["review"] is None
    assert journey["idea"]["reviewed_at"] is None

    row = db.query(StageSubmission).filter_by(project_id=project_id).one()
    db.refresh(row)
    assert row.submitted_at > first
    assert row.reviewed_by is None
    assert row.review_strengths is None
    assert row.evaluation is None
    assert "submission.idea_resubmitted" in audit_actions(db)


def test_a_resubmitted_stage_returns_to_the_queue(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "changes", **FEEDBACK)
    submit(client, student, project_id, SubmissionStage.IDEA)

    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert [item["id"] for item in queues["idea"]] == [project_id]
    assert queues["completed"] == []
    assert decide(
        client, faculty, project_id, SubmissionStage.IDEA, "approve"
    ).status_code == 200


# --- transaction boundary ----------------------------------------------------------


def test_a_decision_that_fails_halfway_leaves_nothing_behind(
    client: TestClient, db: Session, monkeypatch, student, faculty, problem
) -> None:
    """The stage verdict, the selection and the audit share one transaction."""
    project_id = pending_idea(client, student, problem)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)

    real = reviews.record_audit

    def flaky(session, *, action, **kwargs):
        if action == "review.team_selected":
            raise RuntimeError("audit unavailable")
        return real(session, action=action, **kwargs)

    monkeypatch.setattr(reviews, "record_audit", flaky)

    with pytest.raises(RuntimeError):
        reviews.decide(
            db,
            faculty,
            uuid.UUID(project_id),
            SubmissionStage.POC,
            ReviewDecisionIn(decision="select", **FEEDBACK),
        )
    db.rollback()

    poc = db.query(StageSubmission).filter_by(
        project_id=project_id, stage=SubmissionStage.POC
    ).one()
    assert poc.status is SubmissionStatus.SUBMITTED
    assert poc.reviewed_at is None
    assert db.get(Project, uuid.UUID(project_id)).selection_status is (
        SelectionStatus.NOT_REVIEWED
    )
