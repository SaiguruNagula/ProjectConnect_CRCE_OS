"""Solutions Hub reads.

There is no solutions table. A solution is a row of `projects` that faculty
published, and everything the card shows is joined onto it in one statement —
the problem it answers, the mentor who published it, the approved final
submission that carries the deployment link, and the Credit Engine's award.

`published` is the only eligibility flag. `POST /projects/{id}/publication`
already refuses to set it on anything but an approved final project, so this
module re-checks nothing and defines nothing.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import Row, func, select
from sqlalchemy.orm import Session

from app.common.enums import ApplicationStatus, SubmissionStage
from app.modules.credits.models import CreditAward
from app.modules.problems.models import Problem
from app.modules.projects.models import Application, Project, StageSubmission
from app.modules.teams.models import TeamMember
from app.modules.users.models import User


def _live(institution_id: uuid.UUID):
    """What the Solutions Hub is allowed to show, in one place."""
    return (
        Project.institution_id == institution_id,
        Project.deleted_at.is_(None),
        Project.published.is_(True),
    )


def published(db: Session, *, institution_id: uuid.UUID) -> Sequence[Row]:
    """One row per published project — the whole catalog in one query."""
    stmt = (
        select(
            Project,
            Problem.title,
            Problem.department,
            User.name,
            StageSubmission.payload,
            CreditAward.total,
        )
        .join(Problem, Problem.id == Project.problem_id)
        .outerjoin(User, User.id == Project.mentor_id)
        .outerjoin(
            StageSubmission,
            (StageSubmission.project_id == Project.id)
            & (StageSubmission.stage == SubmissionStage.FINAL),
        )
        .outerjoin(
            CreditAward,
            (CreditAward.project_id == Project.id) & (CreditAward.superseded_at.is_(None)),
        )
        .where(*_live(institution_id))
        .order_by(Project.updated_at.desc(), Project.id)
    )
    return db.execute(stmt).all()


def headline(db: Session, *, institution_id: uuid.UUID) -> tuple[int, int]:
    """(live solutions, distinct departments) across the whole hub."""
    row = db.execute(
        select(func.count(Project.id), func.count(func.distinct(Problem.department)))
        .select_from(Project)
        .join(Problem, Problem.id == Project.problem_id)
        .where(*_live(institution_id))
    ).one()
    return int(row[0]), int(row[1])


def contributors(db: Session, *, institution_id: uuid.UUID) -> int:
    """Everyone who built something that shipped, counted once.

    A student reaches a project either through their team or through a solo
    application, so the two routes are unioned rather than added.
    """
    live = select(Project.id, Project.team_id).where(*_live(institution_id)).subquery()
    by_team = select(TeamMember.student_id).join(live, live.c.team_id == TeamMember.team_id)
    by_application = (
        select(Application.student_id)
        .join(live, live.c.id == Application.project_id)
        .where(Application.status == ApplicationStatus.ACTIVE)
    )
    builders = by_team.union(by_application).subquery()
    return int(db.execute(select(func.count()).select_from(builders)).scalar_one())
