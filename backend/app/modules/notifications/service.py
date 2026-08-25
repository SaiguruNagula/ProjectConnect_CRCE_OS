"""Notification reads, read-state writes, and the `notify()` side-effect writer.

`notify()` is the counterpart of `common/audit.record_audit`: it adds a row to
the session the calling module is already in and leaves the commit to that
module. That is the whole reason a notification cannot go out for a review that
did not happen — the notification and the business write are the same
transaction, so they land together or not at all.

The direction of the dependency matters. Modules call *into* here; this module
imports none of them. Notifications observe the domain and never define it.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.errors import NotFoundError
from app.modules.notifications import repository as repo
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationOut
from app.modules.users.models import User


def notify(
    db: Session,
    *,
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
    kind: str,
    title: str,
    message: str,
    entity: str | None = None,
    entity_id: str | None = None,
    event_key: str | None = None,
) -> Notification | None:
    """Raise one notification for one recipient. Joins the caller's transaction.

    Pass `event_key` when the raising action is a one-shot state change: the
    same key for the same user is raised once, so a retried request re-notifies
    nobody. Returns `None` when the event was already raised.
    """
    if event_key is not None and repo.exists(db, user_id=user_id, event_key=event_key):
        return None
    return repo.add(
        db,
        Notification(
            user_id=user_id,
            institution_id=institution_id,
            kind=kind,
            title=title,
            message=message,
            entity=entity,
            entity_id=entity_id,
            event_key=event_key,
        ),
    )


def notify_many(
    db: Session,
    *,
    user_ids: list[uuid.UUID],
    institution_id: uuid.UUID,
    kind: str,
    title: str,
    message: str,
    entity: str | None = None,
    entity_id: str | None = None,
    event_key: str | None = None,
) -> None:
    """The same notification to a group — a team, usually. Order is not meaningful."""
    for user_id in user_ids:
        notify(
            db,
            user_id=user_id,
            institution_id=institution_id,
            kind=kind,
            title=title,
            message=message,
            entity=entity,
            entity_id=entity_id,
            event_key=event_key,
        )


# --- reads ------------------------------------------------------------------------


def _out(row: Notification) -> NotificationOut:
    return NotificationOut(
        id=row.id,
        kind=row.kind,
        title=row.title,
        message=row.message,
        entity=row.entity,
        entity_id=row.entity_id,
        read=row.read_at is not None,
        created_at=row.created_at,
    )


def feed(db: Session, user: User) -> list[NotificationOut]:
    """The caller's own notifications. There is no other user's feed."""
    return [_out(row) for row in repo.list_for_user(db, user.id)]


def mark_read(db: Session, user: User, notification_id: uuid.UUID) -> list[NotificationOut]:
    """Marking is scoped to the owner, so an id belonging to someone else is a 404.

    Not a 403: telling a stranger that a notification exists but is not theirs
    leaks the fact that it exists at all.
    """
    row = repo.get_owned(db, notification_id, user_id=user.id)
    if row is None:
        raise NotFoundError("Notification not found.")
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
    db.commit()
    return feed(db, user)


def mark_all_read(db: Session, user: User) -> list[NotificationOut]:
    repo.mark_all_read(db, user_id=user.id, at=datetime.now(UTC))
    db.commit()
    return feed(db, user)
