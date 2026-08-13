"""Credit Engine data access.

Every balance in this file is `SUM(credit_transactions.points)` — there is no
cached total anywhere, so no two surfaces can disagree about what a user has
earned (ADR-5).

Repositories never commit; the award service owns the transaction.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Row, func, or_, select
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStatus
from app.modules.credits.models import CreditAward, CreditRule, CreditTransaction
from app.modules.problems.models import Problem
from app.modules.projects.models import Project, StageSubmission
from app.modules.users.models import User

PENDING = (SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW)


# --- awards ----------------------------------------------------------------------


def active_award(db: Session, project_id: uuid.UUID) -> CreditAward | None:
    stmt = select(CreditAward).where(
        CreditAward.project_id == project_id, CreditAward.superseded_at.is_(None)
    )
    return db.execute(stmt).scalar_one_or_none()


def lock_active_award(db: Session, project_id: uuid.UUID) -> CreditAward | None:
    """Taken after the project and the stage, so a revision cannot interleave."""
    stmt = (
        select(CreditAward)
        .where(CreditAward.project_id == project_id, CreditAward.superseded_at.is_(None))
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.execute(stmt).scalar_one_or_none()


def active_award_with_awarder(
    db: Session, project_id: uuid.UUID
) -> Row[tuple[CreditAward, str]] | None:
    """The live award plus the name of the faculty member who gave it."""
    stmt = (
        select(CreditAward, User.name)
        .join(User, User.id == CreditAward.awarded_by)
        .where(CreditAward.project_id == project_id, CreditAward.superseded_at.is_(None))
    )
    return db.execute(stmt).first()


def add_award(db: Session, award: CreditAward) -> CreditAward:
    db.add(award)
    # Flush so the database fills in `total` — the generated column is the
    # authority on the sum, not anything the service adds up.
    db.flush()
    db.refresh(award, ["total"])
    return award


def add_transaction(db: Session, transaction: CreditTransaction) -> CreditTransaction:
    db.add(transaction)
    db.flush()
    return transaction


# --- ledger ----------------------------------------------------------------------


def balance(db: Session, user_id: uuid.UUID) -> int:
    """Everything the user holds now, corrections included."""
    stmt = select(func.coalesce(func.sum(CreditTransaction.points), 0)).where(
        CreditTransaction.user_id == user_id
    )
    return int(db.execute(stmt).scalar_one())


def lifetime(db: Session, user_id: uuid.UUID) -> int:
    """Everything ever earned — negative corrections do not erase history."""
    stmt = select(func.coalesce(func.sum(CreditTransaction.points), 0)).where(
        CreditTransaction.user_id == user_id, CreditTransaction.points > 0
    )
    return int(db.execute(stmt).scalar_one())


def history(db: Session, user_id: uuid.UUID) -> Sequence[CreditTransaction]:
    stmt = (
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user_id)
        .order_by(CreditTransaction.created_at.desc(), CreditTransaction.id.desc())
    )
    return db.execute(stmt).scalars().all()


def by_source(db: Session, user_id: uuid.UUID) -> list[Row[tuple[str, int]]]:
    stmt = (
        select(CreditTransaction.source, func.sum(CreditTransaction.points))
        .where(CreditTransaction.user_id == user_id)
        .group_by(CreditTransaction.source)
        .order_by(func.sum(CreditTransaction.points).desc())
    )
    return list(db.execute(stmt).all())


# --- rules -----------------------------------------------------------------------


def active_rules(db: Session, now: datetime) -> Sequence[CreditRule]:
    stmt = (
        select(CreditRule)
        .where(
            CreditRule.active.is_(True),
            CreditRule.effective_from <= now,
            or_(CreditRule.effective_to.is_(None), CreditRule.effective_to > now),
        )
        .order_by(CreditRule.points.desc())
    )
    return db.execute(stmt).scalars().all()


# --- pipeline --------------------------------------------------------------------


def pending_submissions(
    db: Session, project_ids: set[uuid.UUID]
) -> list[Row[tuple[uuid.UUID, str, str, str, int]]]:
    """Submissions still with faculty, with what the problem is worth."""
    if not project_ids:
        return []
    stmt = (
        select(
            StageSubmission.id,
            Project.title,
            StageSubmission.stage,
            StageSubmission.status,
            Problem.base_credits,
        )
        .join(Project, Project.id == StageSubmission.project_id)
        .join(Problem, Problem.id == Project.problem_id)
        .where(
            StageSubmission.project_id.in_(project_ids),
            StageSubmission.status.in_(PENDING),
        )
        .order_by(StageSubmission.submitted_at.asc())
    )
    return list(db.execute(stmt).all())
