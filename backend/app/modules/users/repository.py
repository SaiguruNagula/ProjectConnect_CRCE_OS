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
