"""Application and project data access. Every statement is institution-scoped.

A student's projects are the ones their team executes plus the ones their own
solo application created — one query with an `IN` over their memberships, not a
per-project membership check.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from collections.abc import Sequence

from sqlalchemy import Row, select
from sqlalchemy.orm import Session

from app.common.enums import ApplicationStatus, SubmissionStage
from app.modules.projects.models import Application, Project, StageSubmission
from app.modules.teams.models import TeamMember
from app.modules.users.models import User


def get_project(
    db: Session, project_id: uuid.UUID, *, institution_id: uuid.UUID
) -> Project | None:
    stmt = select(Project).where(
        Project.id == project_id,
        Project.institution_id == institution_id,
        Project.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def lock_project(db: Session, project_id: uuid.UUID) -> Project | None:
    """Take the project row first — writers lock project, then stage, always."""
    stmt = (
        select(Project)
        .where(Project.id == project_id, Project.deleted_at.is_(None))
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.execute(stmt).scalar_one_or_none()


def lock_submission(
    db: Session, *, project_id: uuid.UUID, stage: SubmissionStage
) -> StageSubmission | None:
    """The arbitration point between a resubmission and anything reading a verdict."""
    stmt = (
        select(StageSubmission)
        .where(StageSubmission.project_id == project_id, StageSubmission.stage == stage)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.execute(stmt).scalar_one_or_none()


def _team_ids_of(student_id: uuid.UUID):
    return select(TeamMember.team_id).where(TeamMember.student_id == student_id)


def _solo_project_ids_of(student_id: uuid.UUID):
    return select(Application.project_id).where(
        Application.student_id == student_id,
        Application.status == ApplicationStatus.ACTIVE,
        Application.project_id.is_not(None),
    )


def list_for_student(
    db: Session, *, institution_id: uuid.UUID, student_id: uuid.UUID
) -> Sequence[Project]:
    stmt = (
        select(Project)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            Project.team_id.in_(_team_ids_of(student_id))
            | Project.id.in_(_solo_project_ids_of(student_id)),
        )
        .order_by(Project.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


def list_for_mentor(
    db: Session, *, institution_id: uuid.UUID, mentor_id: uuid.UUID
) -> Sequence[Project]:
    stmt = (
        select(Project)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            Project.mentor_id == mentor_id,
        )
        .order_by(Project.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


def is_member(db: Session, project: Project, student_id: uuid.UUID) -> bool:
    """Membership is the team roster, or being the solo applicant."""
    if project.team_id is not None:
        stmt = select(TeamMember.id).where(
            TeamMember.team_id == project.team_id, TeamMember.student_id == student_id
        )
    else:
        stmt = select(Application.id).where(
            Application.project_id == project.id,
            Application.student_id == student_id,
            Application.status == ApplicationStatus.ACTIVE,
        )
    return db.execute(stmt).first() is not None


def add_project(db: Session, project: Project) -> Project:
    db.add(project)
    db.flush()
    return project


# --- applications --------------------------------------------------------------


def add_application(db: Session, application: Application) -> Application:
    db.add(application)
    db.flush()
    return application


def active_application(
    db: Session, *, problem_id: uuid.UUID, student_id: uuid.UUID
) -> Application | None:
    stmt = select(Application).where(
        Application.problem_id == problem_id,
        Application.student_id == student_id,
        Application.status == ApplicationStatus.ACTIVE,
    )
    return db.execute(stmt).scalar_one_or_none()


def active_team_project(
    db: Session, *, problem_id: uuid.UUID, team_id: uuid.UUID
) -> Project | None:
    """ADR-12: one live project per team per problem."""
    stmt = select(Project).where(
        Project.problem_id == problem_id,
        Project.team_id == team_id,
        Project.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def applicants_by_project(
    db: Session, project_ids: set[uuid.UUID]
) -> dict[uuid.UUID, Row[tuple[uuid.UUID, str]]]:
    """The solo applicant behind a project — a team project has a roster instead."""
    if not project_ids:
        return {}
    rows = db.execute(
        select(Application.project_id, Application.student_id, User.name)
        .join(User, User.id == Application.student_id)
        .where(
            Application.project_id.in_(project_ids),
            Application.status == ApplicationStatus.ACTIVE,
        )
    ).all()
    return {row[0]: row for row in rows}


# --- stage submissions ----------------------------------------------------------


def submissions_by_project(
    db: Session, project_ids: set[uuid.UUID]
) -> dict[uuid.UUID, dict[SubmissionStage, StageSubmission]]:
    if not project_ids:
        return {}
    rows = db.execute(
        select(StageSubmission).where(StageSubmission.project_id.in_(project_ids))
    ).scalars()
    grouped: dict[uuid.UUID, dict[SubmissionStage, StageSubmission]] = defaultdict(dict)
    for row in rows:
        grouped[row.project_id][row.stage] = row
    return grouped


def get_submission(
    db: Session, *, project_id: uuid.UUID, stage: SubmissionStage
) -> StageSubmission | None:
    stmt = select(StageSubmission).where(
        StageSubmission.project_id == project_id, StageSubmission.stage == stage
    )
    return db.execute(stmt).scalar_one_or_none()


def add_submission(db: Session, submission: StageSubmission) -> StageSubmission:
    db.add(submission)
    db.flush()
    return submission


def names_by_id(db: Session, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not user_ids:
        return {}
    rows = db.execute(select(User.id, User.name).where(User.id.in_(user_ids))).all()
    return {row[0]: row[1] for row in rows}
