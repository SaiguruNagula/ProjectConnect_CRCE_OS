"""The review engine (BACKEND_ARCHITECTURE.md §21).

Only the mentor assigned to a project reviews it (ADR-3). A decision is one
transaction: the stage verdict, whatever it settles on the project, and the
audit row commit together or not at all.

The verdict lives on the stage row itself, so a stage carries exactly one
review — the one describing the version faculty last read. There is no review
table and no history.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import SelectionStatus, SubmissionStage, SubmissionStatus
from app.common.errors import BusinessRuleError, NotFoundError, ValidationError
from app.core import authorize
from app.modules.credits import service as credits
from app.modules.projects import repository as projects_repo
from app.modules.projects import service as projects
from app.modules.projects.models import Project, StageSubmission
from app.modules.projects.schemas import LifecycleStatus, ProjectJourneyOut
from app.modules.reviews import repository as repo
from app.modules.reviews.schemas import (
    ReviewDecisionIn,
    ReviewQueueId,
    ReviewQueueItemOut,
    ReviewQueuesOut,
    Verdict,
)
from app.modules.users.models import User

PENDING = (SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW)

# Newest stage first: a project waits in the queue of the furthest stage it has
# reached, and a finished one is filed under the last stage anyone decided.
STAGES_LATEST_FIRST = (SubmissionStage.FINAL, SubmissionStage.POC, SubmissionStage.IDEA)

COMPLETED_LIFECYCLES: tuple[LifecycleStatus, ...] = ("approved", "completed", "rejected")

STATUS_FOR: dict[Verdict, SubmissionStatus] = {
    "approve": SubmissionStatus.APPROVED,
    "select": SubmissionStatus.APPROVED,
    "changes": SubmissionStatus.CHANGES_REQUESTED,
    "reject": SubmissionStatus.REJECTED,
}

ACTION_FOR: dict[Verdict, str] = {
    "approve": "review.stage_approved",
    "select": "review.stage_approved",
    "changes": "review.stage_changes_requested",
    "reject": "review.stage_rejected",
}

NOT_PENDING = "This submission is not waiting for a review."
ALREADY_DECIDED = "This stage has already been decided."
SELECTION_SETTLED = "This team's selection has already been decided."
SELECT_IS_POC_ONLY = (
    "Teams are selected for final development from the proof of concept review."
)
FEEDBACK_REQUIRED = "Explain the decision so the team knows what to do next."


def _mentored(db: Session, faculty: User, project_id: uuid.UUID) -> Project:
    """Another college's project does not exist; a colleague's is not yours."""
    project = projects_repo.get_project(
        db, project_id, institution_id=faculty.institution_id
    )
    if project is None:
        raise NotFoundError("Project not found.")
    authorize.ensure(
        authorize.is_nominated_mentor(faculty, project),
        "Only the assigned mentor can review this project.",
    )
    return project


# --- queues ---------------------------------------------------------------------


def _attachment_count(payload: dict | None) -> int:
    """Every link the team attached to the version under review."""
    if not payload:
        return 0
    total = 0
    for key, value in payload.items():
        if key == "tech_stack":  # a tag list, not an attachment
            continue
        if isinstance(value, list):
            total += sum(1 for item in value if str(item).strip())
        elif isinstance(value, str) and value.startswith("http"):
            total += 1
    return total


def _pending_stage(
    rows: dict[SubmissionStage, StageSubmission],
) -> SubmissionStage | None:
    for stage in STAGES_LATEST_FIRST:
        row = rows.get(stage)
        if row is not None and row.status in PENDING:
            return stage
    return None


def _last_reviewed_stage(
    rows: dict[SubmissionStage, StageSubmission],
) -> SubmissionStage | None:
    for stage in STAGES_LATEST_FIRST:
        row = rows.get(stage)
        if row is not None and row.reviewed_at is not None:
            return stage
    return None


def queues(db: Session, faculty: User) -> ReviewQueuesOut:
    """The four faculty queues, scoped to the projects this mentor owns."""
    projects_owned = list(
        projects_repo.list_for_mentor(
            db, institution_id=faculty.institution_id, mentor_id=faculty.id
        )
    )
    submissions = projects_repo.submissions_by_project(
        db, {project.id for project in projects_owned}
    )
    members = projects.members_by_project(db, projects_owned)
    problems = repo.problem_titles(db, {p.problem_id for p in projects_owned})
    teams = repo.team_names(db, {p.team_id for p in projects_owned if p.team_id})

    collected: dict[ReviewQueueId, list[ReviewQueueItemOut]] = {
        "idea": [],
        "poc": [],
        "final": [],
        "completed": [],
    }
    for project in projects_owned:
        rows = submissions.get(project.id, {})
        lifecycle = projects.lifecycle_of(project, rows)
        reviewed = _last_reviewed_stage(rows)
        pending = _pending_stage(rows)

        if pending is not None:
            queue: ReviewQueueId = pending.value
            stage = pending
        elif lifecycle in COMPLETED_LIFECYCLES:
            queue = "completed"
            stage = reviewed or SubmissionStage.IDEA
        else:
            continue

        row = rows.get(stage)
        collected[queue].append(
            ReviewQueueItemOut(
                id=project.id,
                project_title=project.title,
                problem_id=project.problem_id,
                problem_title=problems.get(project.problem_id),
                team_id=project.team_id,
                team_name=teams.get(project.team_id, projects.SOLO_TEAM_NAME)
                if project.team_id
                else projects.SOLO_TEAM_NAME,
                members=members.get(project.id, []),
                mentor_name=faculty.name,
                stage=stage,
                submitted_at=row.submitted_at if row else None,
                status=lifecycle,
                attachment_count=_attachment_count(row.payload if row else None),
                last_reviewed_stage=reviewed,
            )
        )

    # Oldest submission first — the team that has waited longest is reviewed first.
    for items in collected.values():
        items.sort(key=lambda item: (item.submitted_at is None, item.submitted_at))
    return ReviewQueuesOut(**collected)


def detail(db: Session, faculty: User, project_id: uuid.UUID) -> ProjectJourneyOut:
    """The reviewer's read of the journey — the same composer the student sees.

    Read-only: opening a submission is not a decision and changes nothing.
    """
    return projects.compose_journey(db, _mentored(db, faculty, project_id))


# --- deciding -------------------------------------------------------------------


def _validate(stage: SubmissionStage, payload: ReviewDecisionIn) -> None:
    """The StageReviewPanel's rules, restated at the trust boundary."""
    if payload.verdict == "select" and stage is not SubmissionStage.POC:
        raise ValidationError(
            SELECT_IS_POC_ONLY,
            errors=[{"field": "decision", "message": SELECT_IS_POC_ONLY}],
        )
    if payload.evaluation is not None and stage is not SubmissionStage.FINAL:
        message = "Only a final project is scored."
        raise ValidationError(message, errors=[{"field": "evaluation", "message": message}])
    if payload.verdict in ("changes", "reject") and not payload.has_feedback:
        raise ValidationError(
            FEEDBACK_REQUIRED,
            errors=[{"field": "comments", "message": FEEDBACK_REQUIRED}],
        )
    if stage is SubmissionStage.FINAL and payload.verdict == "approve":
        if payload.evaluation is None:
            message = "Score the final project before approving it."
            raise ValidationError(
                message, errors=[{"field": "evaluation", "message": message}]
            )
        if not payload.evaluation.overall_remarks.strip():
            message = "Record your overall remarks before approving the final project."
            raise ValidationError(
                message,
                errors=[{"field": "evaluation.overall_remarks", "message": message}],
            )


def _settle_selection(
    project: Project,
    status: SelectionStatus,
    feedback: str,
    faculty: User,
    now: datetime,
) -> None:
    project.selection_status = status
    project.selection_feedback = feedback or None
    project.selection_decided_by = faculty.id
    project.selection_decided_at = now


def decide(
    db: Session,
    faculty: User,
    project_id: uuid.UUID,
    stage: SubmissionStage,
    payload: ReviewDecisionIn,
) -> ProjectJourneyOut:
    """One decision, one transaction: verdict, selection/completion and audit."""
    project = _mentored(db, faculty, project_id)
    _validate(stage, payload)

    # Lock the project, then the stage — always that order, so a decision and a
    # resubmission serialise instead of overwriting each other.
    project = repo.lock_project(db, project.id)
    if project is None:
        raise NotFoundError("Project not found.")
    row = repo.lock_submission(db, project_id=project.id, stage=stage)
    if row is None or row.status is SubmissionStatus.DRAFT:
        raise BusinessRuleError(NOT_PENDING)
    if row.status not in PENDING:
        raise BusinessRuleError(ALREADY_DECIDED)

    verdict = payload.verdict
    if verdict == "select" and project.selection_status is not SelectionStatus.NOT_REVIEWED:
        raise BusinessRuleError(SELECTION_SETTLED)

    now = datetime.now(UTC)
    strengths, weaknesses, suggestions, comments = payload.feedback
    was = row.status

    row.status = STATUS_FOR[verdict]
    row.reviewed_at = now
    row.reviewed_by = faculty.id
    row.review_strengths = strengths or None
    row.review_weaknesses = weaknesses or None
    row.review_suggestions = suggestions or None
    row.review_comments = comments or None
    row.evaluation = payload.evaluation.model_dump() if payload.evaluation else None

    record_audit(
        db,
        action=ACTION_FOR[verdict],
        entity="stage_submission",
        entity_id=str(row.id),
        actor_id=faculty.id,
        institution_id=faculty.institution_id,
        meta={
            "project_id": str(project.id),
            "stage": stage.value,
            "from_status": was.value,
            "to_status": row.status.value,
        },
    )

    # Reviewing is faculty work, whatever the verdict. The Credit Engine prices
    # it from the rule table and keys it on the stage row, so re-reviewing a
    # resubmission of the same stage pays once (Phase 5B).
    credits.earn(
        db,
        faculty,
        event_type="REVIEW_COMPLETED",
        source_id=row.id,
        description=project.title,
        context=f"{projects.STAGE_NOUN[stage].capitalize()} review",
    )

    # Approving the final project makes it credit-eligible and nothing more.
    # `completed_at` belongs to the Credit Engine: a project is completed once
    # its credits are awarded (UD-1), so the review engine never sets it.

    # Selecting is the PoC approval that also settles Stage 3, and rejecting a
    # PoC settles it the other way. Both write the project in this transaction.
    selection: SelectionStatus | None = None
    if verdict == "select":
        selection = SelectionStatus.SELECTED
        _settle_selection(project, selection, comments or suggestions, faculty, now)
    elif stage is SubmissionStage.POC and verdict == "reject":
        selection = SelectionStatus.NOT_SELECTED
        _settle_selection(project, selection, weaknesses or comments, faculty, now)

    if selection is not None:
        record_audit(
            db,
            action="review.team_selected"
            if selection is SelectionStatus.SELECTED
            else "review.team_not_selected",
            entity="project",
            entity_id=str(project.id),
            actor_id=faculty.id,
            institution_id=faculty.institution_id,
            meta={"selection_status": selection.value, "stage": stage.value},
        )

    db.commit()
    return projects.compose_journey(db, project)
