"""The notification row (BACKEND_ARCHITECTURE.md §12, Phase 12).

A notification is a *derived* record: something already happened in a module
that owns it, and this table only remembers that a particular user should be
told. Nothing here is a source of truth. Deleting every row would lose no
business fact — the review, the credit, the join request all still exist in the
module that wrote them.

Two deliberate absences:

  * no `link` column. Where a notification points is a frontend route, and the
    backend has no business knowing the URL shape of a React router. The row
    names the entity; the API repository turns that into a path.
  * no free-text payload beyond title/message. Identifiers and one sentence,
    the same discipline `common/audit.py` keeps.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKey


class Notification(UUIDPrimaryKey, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        # The feed query: this user's notifications, newest first.
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
        # One notification per user per event. `event_key` is NULL where the
        # raising action has no one-shot semantics, and Postgres treats NULLs as
        # distinct, so those rows are never blocked by this constraint.
        UniqueConstraint("user_id", "event_key", name="uq_notifications_user_id_event_key"),
    )

    # The recipient. Not the actor: the person who caused the event is usually
    # not the person who needs telling.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    # Carried so the feed can be tenant-filtered without joining users.
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE")
    )
    # Outcome tone, decided by the module that knows the outcome.
    kind: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text)
    # What it is about, for the frontend to build a link from. Never a URL.
    entity: Mapped[str | None] = mapped_column(String(80))
    entity_id: Mapped[str | None] = mapped_column(String(80))
    # Stable per-event identity, used to make raising idempotent (see the
    # unique constraint above). Never shown to anyone.
    event_key: Mapped[str | None] = mapped_column(String(160))
    # Null means unread. A timestamp rather than a boolean because "when did
    # they see it" is free to keep and impossible to recover later.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
