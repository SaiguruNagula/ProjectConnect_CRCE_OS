"""User data access.

Every lookup that can serve a request is institution-scoped. `get_by_email` is
the sole exception: login has no institution context yet, which is why the email
column carries a platform-wide unique constraint.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.enums import UserRole, UserStatus
from app.modules.users.models import User


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == normalize_email(email), User.deleted_at.is_(None))
    return db.execute(stmt).scalar_one_or_none()


def get_by_id(db: Session, user_id: uuid.UUID, *, institution_id: uuid.UUID) -> User | None:
    """Scoped by institution: a foreign id is indistinguishable from a missing one."""
    stmt = select(User).where(
        User.id == user_id,
        User.institution_id == institution_id,
        User.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_by_institution(
    db: Session, institution_id: uuid.UUID, *, limit: int, offset: int
) -> tuple[Sequence[User], int]:
    base = select(User).where(User.institution_id == institution_id, User.deleted_at.is_(None))
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(base.order_by(User.name).limit(limit).offset(offset)).scalars().all()
    return rows, total


def counts_by_role(db: Session, institution_id: uuid.UUID) -> dict[UserRole, int]:
    """The institution's headcount per role. Roles with nobody in them are absent."""
    return _counts(db, institution_id, User.role)


def counts_by_status(db: Session, institution_id: uuid.UUID) -> dict[UserStatus, int]:
    """The same headcount split by account status."""
    return _counts(db, institution_id, User.status)


def _counts(db: Session, institution_id: uuid.UUID, column) -> dict:
    # Counted here rather than off a listed page: the directory endpoint is
    # capped at one page, so anything counted from it would be wrong past the cap.
    stmt = (
        select(column, func.count())
        .where(User.institution_id == institution_id, User.deleted_at.is_(None))
        .group_by(column)
    )
    return {value: int(count) for value, count in db.execute(stmt)}
