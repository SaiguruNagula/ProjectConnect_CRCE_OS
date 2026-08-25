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

from app.common.enums import SubmissionStatus, UserRole
from app.modules.credits import config
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


def transaction_exists(
    db: Session, *, user_id: uuid.UUID, source: str, source_id: uuid.UUID
) -> bool:
    """The `UNIQUE(user_id, source, source_id)` key, read before writing.

    The constraint is the guarantee; this read keeps a repeated event from
    aborting the transaction the triggering operation is running in.
    """
    stmt = select(CreditTransaction.id).where(
        CreditTransaction.user_id == user_id,
        CreditTransaction.source == source,
        CreditTransaction.source_id == source_id,
    )
    return db.execute(stmt).first() is not None


def mentor_share_paid(
    db: Session, *, mentor_id: uuid.UUID, project_id: uuid.UUID
) -> int:
    """What this project's awards have already paid its mentor.

    Keyed on the award rows, so nothing else in the mentor's Mentorship history
    is counted: another project's share, or the flat completion credit this
    policy replaced, which named the project rather than an award.
    """
    awards = select(CreditAward.id).where(CreditAward.project_id == project_id)
    stmt = select(func.coalesce(func.sum(CreditTransaction.points), 0)).where(
        CreditTransaction.user_id == mentor_id,
        CreditTransaction.source == config.SOURCE_MENTORSHIP,
        CreditTransaction.source_id.in_(awards),
    )
    return int(db.execute(stmt).scalar_one())


def awarded_total_by(
    db: Session, *, institution_id: uuid.UUID, faculty_id: uuid.UUID
) -> int:
    """What this mentor's live awards are worth, summed across their projects.

    Superseded revisions are history, not money twice over: a project awarded 80
    and revised to 60 counts 60. `total` is the database's own generated column,
    so nothing is re-added here — this reads the Credit Engine's sum, it does not
    compute one.
    """
    stmt = (
        select(func.coalesce(func.sum(CreditAward.total), 0))
        .join(Project, Project.id == CreditAward.project_id)
        .where(
            CreditAward.awarded_by == faculty_id,
            CreditAward.superseded_at.is_(None),
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
        )
    )
    return int(db.execute(stmt).scalar_one())


# --- ledger ----------------------------------------------------------------------


def balance(db: Session, user_id: uuid.UUID) -> int:
    """Everything the user holds now, corrections included."""
    stmt = select(func.coalesce(func.sum(CreditTransaction.points), 0)).where(
        CreditTransaction.user_id == user_id
    )
    return int(db.execute(stmt).scalar_one())


def balances_of(db: Session, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, int]:
    """The same balance as `balance`, for a page of users in one query.

    A user with no ledger row is absent from the result rather than present as
    zero — the caller reads a default. Exists so the admin directory can show a
    page of balances without asking the Credit Engine once per row, and without
    anyone outside this file writing the sum themselves.
    """
    if not user_ids:
        return {}
    stmt = (
        select(CreditTransaction.user_id, func.sum(CreditTransaction.points))
        .where(CreditTransaction.user_id.in_(user_ids))
        .group_by(CreditTransaction.user_id)
    )
    return {user_id: int(points) for user_id, points in db.execute(stmt)}


def institution_total(db: Session, institution_id: uuid.UUID) -> int:
    """Every point the institution has awarded — the same sum, one tenant wide.

    Corrections are ledger rows like any other, so this nets them out exactly as
    a single balance does. An institution that has awarded nothing totals zero
    rather than returning nothing.
    """
    stmt = select(func.coalesce(func.sum(CreditTransaction.points), 0)).where(
        CreditTransaction.institution_id == institution_id
    )
    return int(db.execute(stmt).scalar_one())


def points_by_project(db: Session, *, institution_id: uuid.UUID) -> dict[uuid.UUID, int]:
    """Every ledger point traceable to a project, keyed by that project (Phase 13).

    An award pays the team and the mentor, and both rows carry the award as
    their `source_id` — the same link `mentor_share_paid` follows. A revision
    posts its difference against a new award on the same project, so summing
    every award a project has ever carried nets to what it is worth now.

    Rule-priced credits (a published problem, a completed review) name no award
    and are absent by construction: this answers "what did this project pay
    out", not "what has the institution earned". `institution_total` is still
    the only answer to the second question, and the two deliberately differ.
    """
    stmt = (
        select(CreditAward.project_id, func.sum(CreditTransaction.points))
        .join(CreditTransaction, CreditTransaction.source_id == CreditAward.id)
        .join(Project, Project.id == CreditAward.project_id)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
        )
        .group_by(CreditAward.project_id)
    )
    return {project_id: int(points) for project_id, points in db.execute(stmt)}


def monthly_points(
    db: Session, *, institution_id: uuid.UUID, since: datetime
) -> dict[datetime, int]:
    """Credits posted per calendar month since `since`, keyed by the month's start.

    Real history, not a projection: the ledger is append-only, so the month a
    row was posted in is a fact it has carried since it was written. Months in
    which nothing was posted are absent — the caller owns the window, and only
    the caller knows how far back it goes.
    """
    # Truncated in UTC explicitly: `created_at` is a timestamptz, and left to
    # itself date_trunc would cut the month at whatever the session's timezone
    # happens to be, so the same ledger could report two different Julys.
    month = func.date_trunc("month", func.timezone("UTC", CreditTransaction.created_at))
    stmt = (
        select(month, func.sum(CreditTransaction.points))
        .where(
            CreditTransaction.institution_id == institution_id,
            CreditTransaction.created_at >= since,
        )
        .group_by(month)
    )
    return {start: int(points) for start, points in db.execute(stmt)}


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


def active_rule(
    db: Session, role: UserRole, event_type: str, now: datetime
) -> CreditRule | None:
    """What this event is worth to this role right now, or nothing if unruled."""
    stmt = (
        select(CreditRule)
        .where(
            CreditRule.role == role,
            CreditRule.event_type == event_type,
            CreditRule.active.is_(True),
            CreditRule.effective_from <= now,
            or_(CreditRule.effective_to.is_(None), CreditRule.effective_to > now),
        )
        .order_by(CreditRule.effective_from.desc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


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
