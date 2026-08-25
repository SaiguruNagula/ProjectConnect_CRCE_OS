"""Applications and the project space.

Applying creates the project in the same transaction (ADR-1) — there is no
faculty acceptance step between them. Everything the workspace renders is
composed here from the stage rows exactly as the mock's `composeJourney` does,
so a card, a badge and a timeline cannot disagree.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import (
    ApplicationStatus,
    ProblemStatus,
    SelectionStatus,
    SubmissionStage,
    SubmissionStatus,
    UserRole,
)
from app.common.errors import BusinessRuleError, NotFoundError
from app.core import authorize
from app.modules.credits import repository as credits_repo
from app.modules.credits.schemas import CreditAwardOut
from app.modules.notifications import service as notifications
from app.modules.problems import repository as problems_repo
from app.modules.projects import repository as repo
from app.modules.projects.models import Application, Project, StageSubmission
from app.modules.projects.schemas import (
    ApplicationInput,
    JourneyStage,
    LifecycleStatus,
    ProjectJourneyOut,
    ProjectOut,
    ProjectStatus,
    SelectionStateOut,
    StageStateOut,
    TimelineEventOut,
)
from app.modules.teams import repository as teams_repo
from app.modules.teams.schemas import TeamMemberOut
from app.modules.users.models import User

PENDING = (SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW)
NEEDS_WORK = (SubmissionStatus.DRAFT, SubmissionStatus.CHANGES_REQUESTED)

SOLO_TEAM_NAME = "Individual entry"

STAGE_NOUN = {
    SubmissionStage.IDEA: "idea",
    SubmissionStage.POC: "proof of concept",
    SubmissionStage.FINAL: "final project",
}


class _Journey:
    """The four stage states of one project, however sparse the rows are."""

    def __init__(self, project: Project, rows: dict[SubmissionStage, StageSubmission]):
        self.project = project
        self.rows = rows

    def status(self, stage: SubmissionStage) -> SubmissionStatus:
        row = self.rows.get(stage)
        return row.status if row else SubmissionStatus.DRAFT

    @property
    def idea(self) -> SubmissionStatus:
        return self.status(SubmissionStage.IDEA)

    @property
    def poc(self) -> SubmissionStatus:
        return self.status(SubmissionStage.POC)

    @property
    def final(self) -> SubmissionStatus:
        return self.status(SubmissionStage.FINAL)

    @property
    def selection(self) -> SelectionStatus:
        return self.project.selection_status


def _stage_state(row: StageSubmission | None, reviewer: str | None) -> StageStateOut:
    if row is None:
        return StageStateOut(status=SubmissionStatus.DRAFT)
    review = None
    if row.reviewed_at is not None:
        review = {
            "strengths": row.review_strengths,
            "weaknesses": row.review_weaknesses,
            "suggestions": row.review_suggestions,
            "comments": row.review_comments,
            "reviewed_by": reviewer,
            "evaluation": row.evaluation,
        }
    return StageStateOut(
        status=row.status,
        data=row.payload,
        saved_at=row.saved_at,
        submitted_at=row.submitted_at,
        review=review,
        reviewed_at=row.reviewed_at,
    )


def _unlocked(journey: _Journey) -> list[JourneyStage]:
    """Each stage opens once the previous one has left draft; Final needs selection."""
    stages: list[JourneyStage] = ["idea"]
    if journey.idea is not SubmissionStatus.DRAFT:
        stages.append("poc")
    if journey.poc is not SubmissionStatus.DRAFT:
        stages.append("selection")
    if journey.selection is SelectionStatus.SELECTED:
        stages.append("final")
    return stages


def _current_stage(journey: _Journey) -> JourneyStage:
    """Work owed comes before work waiting."""
    if journey.idea in NEEDS_WORK:
        return "idea"
    if journey.poc in NEEDS_WORK:
        return "poc"
    if journey.selection is not SelectionStatus.SELECTED:
        return "selection"
    return "final"


def _stage_status(journey: _Journey, stage: JourneyStage) -> str:
    if stage == "selection":
        return journey.selection.value
    return journey.status(SubmissionStage(stage)).value


def _lifecycle(journey: _Journey) -> LifecycleStatus:
    """One status for every surface, read latest-first."""
    if journey.final is SubmissionStatus.APPROVED:
        return "completed" if journey.project.completed_at else "approved"
    if journey.final is SubmissionStatus.REJECTED:
        return "rejected"
    if journey.final is SubmissionStatus.CHANGES_REQUESTED:
        return "changes_requested"
    if journey.final in PENDING:
        return "final_submitted"
    if journey.selection is SelectionStatus.SELECTED:
        return "selected_for_final"
    if journey.selection is SelectionStatus.NOT_SELECTED:
        return "rejected"
    if journey.poc is SubmissionStatus.APPROVED:
        return "poc_approved"
    if journey.poc is SubmissionStatus.REJECTED:
        return "rejected"
    if journey.poc is SubmissionStatus.CHANGES_REQUESTED:
        return "changes_requested"
    if journey.poc in PENDING:
        return "poc_submitted"
    if journey.idea is SubmissionStatus.APPROVED:
        return "idea_approved"
    if journey.idea is SubmissionStatus.REJECTED:
        return "rejected"
    if journey.idea is SubmissionStatus.CHANGES_REQUESTED:
        return "changes_requested"
    return "idea_submitted"


def lifecycle_of(
    project: Project, rows: dict[SubmissionStage, StageSubmission]
) -> LifecycleStatus:
    """The lifecycle status of one project — the review queues read it too."""
    return _lifecycle(_Journey(project, rows))


def _timeline(journey: _Journey) -> list[TimelineEventOut]:
    """Always the same seven steps in the same order — only the ticks change."""
    idea, poc, final = (
        journey.rows.get(SubmissionStage.IDEA),
        journey.rows.get(SubmissionStage.POC),
        journey.rows.get(SubmissionStage.FINAL),
    )
    project = journey.project
    return [
        TimelineEventOut(
            status="idea_submitted",
            label="Idea Submitted",
            at=idea.submitted_at if idea else None,
            done=journey.idea is not SubmissionStatus.DRAFT,
        ),
        TimelineEventOut(
            status="idea_approved",
            label="Idea Approved",
            at=idea.reviewed_at if idea else None,
            done=journey.idea is SubmissionStatus.APPROVED,
        ),
        TimelineEventOut(
            status="poc_submitted",
            label="PoC Submitted",
            at=poc.submitted_at if poc else None,
            done=journey.poc is not SubmissionStatus.DRAFT,
        ),
        TimelineEventOut(
            status="poc_approved",
            label="PoC Approved",
            at=poc.reviewed_at if poc else None,
            done=journey.poc is SubmissionStatus.APPROVED,
        ),
        TimelineEventOut(
            status="selected_for_final",
            label="Selected for Final Development",
            at=project.selection_decided_at,
            done=journey.selection is SelectionStatus.SELECTED,
        ),
        TimelineEventOut(
            status="final_submitted",
            label="Final Submitted",
            at=final.submitted_at if final else None,
            done=journey.final is not SubmissionStatus.DRAFT,
        ),
        TimelineEventOut(
            status="completed",
            label="Completed",
            at=final.reviewed_at if final else None,
            done=journey.final is SubmissionStatus.APPROVED,
        ),
    ]


def _progress(journey: _Journey) -> int:
    """Stages completed out of four — derived, never stored."""
    done = sum(
        (
            journey.idea is SubmissionStatus.APPROVED,
            journey.poc is SubmissionStatus.APPROVED,
            journey.selection is SelectionStatus.SELECTED,
            journey.final is SubmissionStatus.APPROVED,
        )
    )
    return done * 25


def _project_status(journey: _Journey) -> ProjectStatus:
    if journey.final is SubmissionStatus.APPROVED:
        return "completed"
    if any(status in PENDING for status in (journey.idea, journey.poc, journey.final)):
        return "in_review"
    return "active"


def members_by_project(
    db: Session, projects: list[Project]
) -> dict[uuid.UUID, list[TeamMemberOut]]:
    """Team roster for team projects; the applicant alone for solo ones."""
    team_ids = {p.team_id for p in projects if p.team_id}
    solo_ids = {p.id for p in projects if p.team_id is None}
    rosters = teams_repo.members_by_team(db, team_ids)
    applicants = repo.applicants_by_project(db, solo_ids)

    members: dict[uuid.UUID, list[TeamMemberOut]] = {}
    for project in projects:
        if project.team_id:
            members[project.id] = [
                TeamMemberOut.of(member.student_id, name, member.role)
                for member, name in rosters.get(project.team_id, [])
            ]
        else:
            row = applicants.get(project.id)
            members[project.id] = (
                [TeamMemberOut.of(row[1], row[2], "Individual")] if row else []
            )
    return members


def views(db: Session, projects: list[Project]) -> list[ProjectOut]:
    """The list read model, batched. Public because Portfolio composes with it
    rather than keeping a second copy of a project."""
    submissions = repo.submissions_by_project(db, {p.id for p in projects})
    members = members_by_project(db, projects)
    mentors = repo.names_by_id(db, {p.mentor_id for p in projects if p.mentor_id})
    views = []
    for project in projects:
        journey = _Journey(project, submissions.get(project.id, {}))
        stage = _current_stage(journey)
        views.append(
            ProjectOut(
                id=project.id,
                title=project.title,
                summary=project.summary,
                status=_project_status(journey),
                progress=_progress(journey),
                mentor_name=mentors.get(project.mentor_id, "") if project.mentor_id else "",
                members=members.get(project.id, []),
                problem_id=project.problem_id,
                team_id=project.team_id,
                stage=stage,
                stage_status=_stage_status(journey, stage),
                completed_at=project.completed_at,
            )
        )
    return views


def _load(db: Session, project_id: uuid.UUID, viewer: User) -> Project:
    project = repo.get_project(db, project_id, institution_id=viewer.institution_id)
    if project is None:
        raise NotFoundError("Project not found.")
    return project


def _ensure_can_read(db: Session, project: Project, viewer: User) -> None:
    """Members and the assigned mentor only — nobody else sees a workspace."""
    if viewer.role is UserRole.STUDENT:
        authorize.ensure(
            repo.is_member(db, project, viewer.id),
            "You do not have permission to perform this action.",
        )
        return
    authorize.ensure(
        authorize.is_nominated_mentor(viewer, project),
        "You do not have permission to perform this action.",
    )


def list_projects(db: Session, viewer: User) -> list[ProjectOut]:
    if viewer.role is UserRole.STUDENT:
        projects = repo.list_for_student(
            db, institution_id=viewer.institution_id, student_id=viewer.id
        )
    else:
        projects = repo.list_for_mentor(
            db, institution_id=viewer.institution_id, mentor_id=viewer.id
        )
    return views(db, list(projects))


def get_project(db: Session, viewer: User, project_id: uuid.UUID) -> ProjectOut:
    project = _load(db, project_id, viewer)
    _ensure_can_read(db, project, viewer)
    return views(db, [project])[0]


def journey(db: Session, viewer: User, project_id: uuid.UUID) -> ProjectJourneyOut:
    project = _load(db, project_id, viewer)
    _ensure_can_read(db, project, viewer)
    return compose_journey(db, project)


def _credits(db: Session, project: Project) -> dict | None:
    """The live award, read from the Credit Engine — nothing is summed here."""
    row = credits_repo.active_award_with_awarder(db, project.id)
    if row is None:
        return None
    award, awarded_by = row
    return CreditAwardOut(
        innovation=award.innovation,
        implementation=award.implementation,
        documentation=award.documentation,
        presentation=award.presentation,
        bonus=award.bonus,
        total=award.total,
        awarded_by=awarded_by,
        awarded_at=award.awarded_at,
    ).model_dump(mode="json")


def compose_journey(db: Session, project: Project) -> ProjectJourneyOut:
    rows = repo.submissions_by_project(db, {project.id}).get(project.id, {})
    state = _Journey(project, rows)
    members = members_by_project(db, [project])[project.id]

    team = (
        teams_repo.get(db, project.team_id, institution_id=project.institution_id)
        if project.team_id
        else None
    )
    problem = problems_repo.get(
        db, project.problem_id, institution_id=project.institution_id
    )
    reviewer_ids = {row.reviewed_by for row in rows.values() if row.reviewed_by}
    if project.selection_decided_by:
        reviewer_ids.add(project.selection_decided_by)
    if project.mentor_id:
        reviewer_ids.add(project.mentor_id)
    names = repo.names_by_id(db, reviewer_ids)

    def stage_out(stage: SubmissionStage) -> StageStateOut:
        row = rows.get(stage)
        reviewer = names.get(row.reviewed_by) if row and row.reviewed_by else None
        return _stage_state(row, reviewer)

    return ProjectJourneyOut(
        project_id=project.id,
        title=project.title,
        problem_id=project.problem_id,
        problem_title=problem.title if problem else None,
        team_id=project.team_id,
        team_name=team.name if team else SOLO_TEAM_NAME,
        mentor_name=names.get(project.mentor_id, "") if project.mentor_id else "",
        members=members,
        current_stage=_current_stage(state),
        unlocked_stages=_unlocked(state),
        idea=stage_out(SubmissionStage.IDEA),
        poc=stage_out(SubmissionStage.POC),
        selection=SelectionStateOut(
            status=project.selection_status,
            feedback=project.selection_feedback,
            decided_by=names.get(project.selection_decided_by)
            if project.selection_decided_by
            else None,
            decided_at=project.selection_decided_at,
        ),
        final=stage_out(SubmissionStage.FINAL),
        status=_lifecycle(state),
        timeline=_timeline(state),
        credits=_credits(db, project),
        published=project.published,
    )


def set_publication(
    db: Session, faculty: User, project_id: uuid.UUID, publish: bool
) -> ProjectJourneyOut:
    """Show an approved project in the Solutions Hub, or take it back down.

    Publication is a flag on the project and nothing more: it awards no
    credits, completes nothing and creates no Solutions Hub row — the hub is a
    read of this flag, so it follows both ways on the next request. Credits are
    not a precondition: an approved final project can be published before
    anyone has scored it.
    """
    project = _load(db, project_id, faculty)
    authorize.ensure(
        authorize.is_nominated_mentor(faculty, project),
        "Only the assigned mentor can publish this project.",
    )
    project = repo.lock_project(db, project.id)
    if project is None:
        raise NotFoundError("Project not found.")
    final = repo.get_submission(db, project_id=project.id, stage=SubmissionStage.FINAL)
    if final is None or final.status is not SubmissionStatus.APPROVED:
        raise BusinessRuleError("Only an approved final project can be published.")

    project.published = publish
    record_audit(
        db,
        action="project.published" if publish else "project.unpublished",
        entity="project",
        entity_id=str(project.id),
        actor_id=faculty.id,
        institution_id=faculty.institution_id,
        meta={"published": publish},
    )
    db.commit()
    return compose_journey(db, project)


# --- applying -------------------------------------------------------------------


def apply_to_problem(
    db: Session, student: User, problem_id: uuid.UUID, payload: ApplicationInput
) -> ProjectOut:
    """One transaction: the application and the project it opens (ADR-1)."""
    problem = problems_repo.get(db, problem_id, institution_id=student.institution_id)
    if problem is None:
        raise NotFoundError("Problem not found.")
    if problem.status is ProblemStatus.CLOSED:
        raise BusinessRuleError("This problem is closed to new applications.")
    if repo.active_application(db, problem_id=problem.id, student_id=student.id):
        raise BusinessRuleError("You have already applied to this problem.")

    team = None
    if payload.team_id is not None:
        team = teams_repo.get(db, payload.team_id, institution_id=student.institution_id)
        if team is None:
            raise NotFoundError("Team not found.")
        if team.problem_id != problem.id:
            raise BusinessRuleError("That team is not working on this problem.")
        authorize.ensure(
            authorize.is_team_lead(student, team),
            "Only the team lead can apply on behalf of the team.",
        )
        if repo.active_team_project(db, problem_id=problem.id, team_id=team.id):
            raise BusinessRuleError("Your team has already applied to this problem.")

    project = repo.add_project(
        db,
        Project(
            institution_id=student.institution_id,
            problem_id=problem.id,
            team_id=team.id if team else None,
            # The problem's faculty owner mentors whatever it produces (ADR-3).
            mentor_id=problem.created_by,
            title=problem.title,
            summary=payload.idea_summary.strip(),
            selection_status=SelectionStatus.NOT_REVIEWED,
        ),
    )
    application = repo.add_application(
        db,
        Application(
            problem_id=problem.id,
            student_id=student.id,
            team_id=team.id if team else None,
            project_id=project.id,
            idea_summary=payload.idea_summary.strip(),
            approach=payload.approach.strip(),
            attachment_url=str(payload.attachment_url) if payload.attachment_url else None,
            status=ApplicationStatus.ACTIVE,
        ),
    )
    # The Idea stage exists from the start: the workspace opens on a draft.
    repo.add_submission(
        db,
        StageSubmission(
            project_id=project.id,
            stage=SubmissionStage.IDEA,
            status=SubmissionStatus.DRAFT,
        ),
    )
    record_audit(
        db,
        action="application.created",
        entity="application",
        entity_id=str(application.id),
        actor_id=student.id,
        institution_id=student.institution_id,
        meta={
            "problem_id": str(problem.id),
            "project_id": str(project.id),
            "team_id": str(team.id) if team else None,
        },
    )
    # The mentor hears that someone picked their problem up. The review queues
    # only carry submitted work, so without this the application is invisible to
    # faculty until the idea itself arrives.
    notifications.notify(
        db,
        user_id=problem.created_by,
        institution_id=student.institution_id,
        kind="info",
        title="New application to your problem",
        message=f"{student.name} applied to {problem.title}.",
        entity="project",
        entity_id=str(project.id),
        event_key=f"application.created:{application.id}",
    )
    db.commit()
    return views(db, [project])[0]


def withdraw_application(db: Session, student: User, problem_id: uuid.UUID) -> None:
    """Withdrawing soft-deletes the project the application opened."""
    problem = problems_repo.get(db, problem_id, institution_id=student.institution_id)
    if problem is None:
        raise NotFoundError("Problem not found.")
    application = repo.active_application(
        db, problem_id=problem.id, student_id=student.id
    )
    if application is None:
        raise NotFoundError("You have not applied to this problem.")

    now = datetime.now(UTC)
    project = (
        repo.get_project(db, application.project_id, institution_id=student.institution_id)
        if application.project_id
        else None
    )
    if project is not None:
        idea = repo.get_submission(
            db, project_id=project.id, stage=SubmissionStage.IDEA
        )
        if idea is not None and idea.status is not SubmissionStatus.DRAFT:
            raise BusinessRuleError(
                "Your idea is already with faculty — it can no longer be withdrawn."
            )
        project.deleted_at = now

    application.status = ApplicationStatus.WITHDRAWN
    application.withdrawn_at = now
    record_audit(
        db,
        action="application.withdrawn",
        entity="application",
        entity_id=str(application.id),
        actor_id=student.id,
        institution_id=student.institution_id,
        meta={"problem_id": str(problem.id)},
    )
    db.commit()


# --- stage saves ----------------------------------------------------------------


def _guard(journey: _Journey, stage: SubmissionStage) -> None:
    """The mock's stage gates, in the mock's order and wording.

    Only `draft` and `changes_requested` are writable: an approved stage is
    settled and a rejected one is terminal, so neither takes another edit.
    """
    current = journey.status(stage)
    noun = STAGE_NOUN[stage]
    if stage is SubmissionStage.POC and journey.idea is SubmissionStatus.DRAFT:
        raise BusinessRuleError("Submit your idea before the proof of concept.")
    if stage is SubmissionStage.FINAL and journey.selection is not SelectionStatus.SELECTED:
        raise BusinessRuleError(
            "Only teams selected for final development can submit a final project."
        )
    if current is SubmissionStatus.APPROVED:
        raise BusinessRuleError(f"Your {noun} has already been approved.")
    if current is SubmissionStatus.REJECTED:
        raise BusinessRuleError(f"Your {noun} was rejected and cannot be resubmitted.")
    if current in PENDING:
        raise BusinessRuleError(f"Your {noun} is already with faculty for review.")


def _clear_review(row: StageSubmission) -> None:
    """There is no review history: a resubmission drops the previous verdict."""
    row.reviewed_at = None
    row.reviewed_by = None
    row.review_strengths = None
    row.review_weaknesses = None
    row.review_suggestions = None
    row.review_comments = None
    row.evaluation = None


def save_stage(
    db: Session,
    student: User,
    project_id: uuid.UUID,
    stage: SubmissionStage,
    payload: dict,
    *,
    submit: bool,
) -> ProjectJourneyOut:
    project = _load(db, project_id, student)
    authorize.ensure(
        repo.is_member(db, project, student.id),
        "You do not have permission to perform this action.",
    )

    rows = repo.submissions_by_project(db, {project.id}).get(project.id, {})
    _guard(_Journey(project, rows), stage)

    now = datetime.now(UTC)
    row = rows.get(stage)
    if row is None:
        row = repo.add_submission(
            db,
            StageSubmission(
                project_id=project.id, stage=stage, status=SubmissionStatus.DRAFT
            ),
        )
        rows[stage] = row
    resubmission = row.reviewed_at is not None
    row.payload = payload
    row.saved_at = now
    # Submitting moves the stage to `submitted`; the review status that follows
    # is faculty's to set, never the student's.
    if submit:
        row.status = SubmissionStatus.SUBMITTED
        row.submitted_at = now
        # A stage carries one review at a time: the verdict on the version that
        # was rewritten no longer describes what faculty are about to read.
        if resubmission:
            _clear_review(row)
    else:
        row.status = SubmissionStatus.DRAFT

    if submit:
        record_audit(
            db,
            action=f"submission.{stage.value}_"
            + ("resubmitted" if resubmission else "submitted"),
            entity="stage_submission",
            entity_id=str(row.id),
            actor_id=student.id,
            institution_id=student.institution_id,
            meta={"project_id": str(project.id)},
        )
    db.commit()
    return compose_journey(db, project)
