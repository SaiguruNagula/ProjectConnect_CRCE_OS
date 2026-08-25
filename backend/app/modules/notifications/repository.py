"""Notification persistence. Every read is keyed on the recipient.

There is no accessor here that fetches a notification by id alone: the id is
always paired with the owner, so a caller cannot accidentally write a query
that reaches another user's row.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification

# The bell shows a panel, not an archive. Older notifications stay in the table;
# nothing in the UI pages through them.
FEED_LIMIT = 50


def add(db: Session, notification: Notification) -> Notification:
    """Adds the row to the session; the caller's transaction commits it."""
    db.add(notification)
    return notification


def exists(db: Session, *, user_id: uuid.UUID, event_key: str) -> bool:
    stmt = select(Notification.id).where(
        Notification.user_id == user_id, Notification.event_key == event_key
    )
    return db.execute(stmt.limit(1)).first() is not None


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(FEED_LIMIT)
    )
    return list(db.execute(stmt).scalars())


def get_owned(
    db: Session, notification_id: uuid.UUID, *, user_id: uuid.UUID
) -> Notification | None:
    stmt = select(Notification).where(
        Notification.id == notification_id, Notification.user_id == user_id
    )
    return db.execute(stmt).scalar_one_or_none()


def mark_all_read(db: Session, *, user_id: uuid.UUID, at: datetime) -> None:
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=at)
    )
    db.execute(stmt)
