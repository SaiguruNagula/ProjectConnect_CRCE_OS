"""Notification routes (Phase 12).

Three routes, no role gate and no parameters that name a user. Every role has a
notification bell, so the gate here is ownership rather than role: the feed is
the token's subject, and `PATCH /{id}/read` will not touch a row that is not
theirs. There is deliberately no `?user_id=` and no `/notifications/{userId}`.

Both mutations answer with the whole updated feed, which is what the bell
re-renders from — one round trip instead of a write followed by a refetch.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.notifications import service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.feed(db, current_user), "Notifications loaded.")


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> dict[str, object]:
    return ok(service.mark_read(db, current_user, notification_id), "Notification updated.")


@router.post("/read-all")
def mark_all_read(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.mark_all_read(db, current_user), "Notifications updated.")
