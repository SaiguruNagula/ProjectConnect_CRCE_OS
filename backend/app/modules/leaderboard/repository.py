"""Leaderboard data access — one aggregate query, both boards.

The board is `SUM(credit_transactions.points)` grouped by user and ranked by
the database. Nothing here counts projects, reviews or achievements into a
score: those are display columns, computed in the same statement so a board of
a few hundred people is still one round trip.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ColumnElement, Row, func, select
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.modules.credits.models import CreditTransaction
from app.modules.projects import repository as projects_repo
from app.modules.projects.models import Project
from app.modules.users.models import User


def _contributions(role: UserRole) -> ColumnElement[int]:
    """The count under the `contributions` column — a display figure.

    A student ships projects; a mentor carries them. Both correlate against
    `users`, so they are one scalar subquery per row rather than a query per
    person.
    """
    if role is UserRole.FACULTY:
        where = (Project.mentor_id == User.id,)
    else:
        where = (
            Project.completed_at.is_not(None),
            projects_repo.belongs_to_student(User.id),
        )
    return (
        select(func.count())
        .select_from(Project)
        .where(Project.deleted_at.is_(None), *where)
        .correlate(User)
        .scalar_subquery()
    )


def board(
    db: Session, *, institution_id: uuid.UUID, role: UserRole
) -> list[Row[tuple[uuid.UUID, str, UserRole, int, int, int]]]:
    """One institution's board for one role, ranked by the database.

    RANK(), not ROW_NUMBER(): two people on the same credits share a place.

    The join is inner, so the board is the people the ledger knows about. A
    user who has never been credited is not ranked last — they are not on the
    board at all, which is also what the frozen fixture shows.
    """
    credits = func.sum(CreditTransaction.points)
    stmt = (
        select(
            User.id,
            User.name,
            User.role,
            credits.label("credits"),
            func.rank().over(order_by=credits.desc()).label("rank"),
            _contributions(role).label("contributions"),
        )
        .join(
            CreditTransaction,
            (CreditTransaction.user_id == User.id)
            # Tenancy on both sides: a ledger row from another college could
            # never reach this user, and if one ever did it would not count.
            & (CreditTransaction.institution_id == institution_id),
        )
        .where(
            User.institution_id == institution_id,
            User.role == role,
            User.deleted_at.is_(None),
        )
        .group_by(User.id, User.name, User.role)
        .order_by(credits.desc(), User.name)
    )
    return list(db.execute(stmt).all())
