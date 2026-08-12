"""Refresh-token persistence: issue, look up by jti, revoke."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.auth.models import RefreshToken


def store(
    db: Session, *, user_id: uuid.UUID, jti: str, expires_at: datetime
) -> RefreshToken:
    row = RefreshToken(user_id=user_id, jti=jti, expires_at=expires_at)
    db.add(row)
    return row


def get_by_jti(db: Session, jti: str) -> RefreshToken | None:
    return db.execute(select(RefreshToken).where(RefreshToken.jti == jti)).scalar_one_or_none()


def revoke(db: Session, row: RefreshToken) -> None:
    if row.revoked_at is None:
        row.revoked_at = datetime.now(UTC)


def revoke_all_for_user(db: Session, user_id: uuid.UUID) -> None:
    """Used on refresh-token reuse: the whole family is assumed compromised."""
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
