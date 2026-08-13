"""Review data access.

Only two things are new here: the locking reads that make a decision safe
against a concurrent resubmission, and the batch title lookups the queue cards
need. Everything else the review engine reads already has a repository in
`projects`, and is reused from there.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage
from app.modules.problems.models import Problem
from app.modules.projects.models import Project, StageSubmission
from app.modules.teams.models import Team


def lock_project(db: Session, project_id: uuid.UUID) -> Project | None:
    """Take the project row first — decisions lock project, then stage, always."""
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
    """The arbitration point: a student resubmit and a decision cannot interleave."""
    stmt = (
        select(StageSubmission)
        .where(StageSubmission.project_id == project_id, StageSubmission.stage == stage)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.execute(stmt).scalar_one_or_none()


def problem_titles(db: Session, problem_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not problem_ids:
        return {}
    rows = db.execute(
        select(Problem.id, Problem.title).where(Problem.id.in_(problem_ids))
    ).all()
    return {row[0]: row[1] for row in rows}


def team_names(db: Session, team_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not team_ids:
        return {}
    rows = db.execute(select(Team.id, Team.name).where(Team.id.in_(team_ids))).all()
    return {row[0]: row[1] for row in rows}
