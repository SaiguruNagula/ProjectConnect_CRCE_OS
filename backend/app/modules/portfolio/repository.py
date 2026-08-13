"""Portfolio reads.

No portfolio table exists and none is needed: a portfolio is a query over the
modules that already own the facts. Every statement here is scoped to one
institution and one user, both taken from the authenticated caller.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.modules.problems.models import Problem
from app.modules.projects import repository as projects_repo
from app.modules.projects.models import Project, StageSubmission


def _owned_by(user_id: uuid.UUID, role: UserRole):
    """A student's projects are the ones they worked on; a mentor's are the ones
    they were nominated to."""
    if role is UserRole.FACULTY:
        return Project.mentor_id == user_id
    return projects_repo.belongs_to_student(user_id)


def completed_projects(
    db: Session, *, institution_id: uuid.UUID, user_id: uuid.UUID, role: UserRole
) -> Sequence[Project]:
    """Finished work only.

    `completed_at` is written by the Credit Engine award and nothing else
    (UD-1), so it is the repository's one definition of a completed project. An
    approved-but-unscored project is not a verified achievement and is left out.
    """
    stmt = (
        select(Project)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            Project.completed_at.is_not(None),
            _owned_by(user_id, role),
        )
        .order_by(Project.completed_at.desc())
    )
    return db.execute(stmt).scalars().all()


def published_projects(
    db: Session, *, institution_id: uuid.UUID, user_id: uuid.UUID, role: UserRole
) -> int:
    """The Solutions Hub has no table yet — `projects.published` is the whole of it.

    Publication has its own rule (an approved final stage, flipped by the
    assigned mentor), which is not completion, so this is counted separately
    rather than filtered out of `completed_projects`.
    """
    stmt = select(func.count()).where(
        Project.institution_id == institution_id,
        Project.deleted_at.is_(None),
        Project.published.is_(True),
        _owned_by(user_id, role),
    )
    return int(db.execute(stmt).scalar_one())


def problems_published(db: Session, *, institution_id: uuid.UUID, user_id: uuid.UUID) -> int:
    """Drafts live in `problem_drafts`; a row in `problems` is already published."""
    stmt = select(func.count()).where(
        Problem.institution_id == institution_id,
        Problem.created_by == user_id,
        Problem.deleted_at.is_(None),
    )
    return int(db.execute(stmt).scalar_one())


def reviews_completed(db: Session, *, institution_id: uuid.UUID, user_id: uuid.UUID) -> int:
    """`reviewed_by` is set only by a review decision, so counting it counts reviews."""
    stmt = (
        select(func.count())
        .select_from(StageSubmission)
        .join(Project, Project.id == StageSubmission.project_id)
        .where(
            StageSubmission.reviewed_by == user_id,
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
        )
    )
    return int(db.execute(stmt).scalar_one())
