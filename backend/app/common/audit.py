"""Audit log model + writer (BACKEND_ARCHITECTURE.md §32, §41 `common/`).

Records who did what, when. Never stores request bodies, tokens or passwords —
`meta` is for identifiers and outcomes only.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.db.base import Base, UUIDPrimaryKey


class AuditLog(UUIDPrimaryKey, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_institution_id_created_at", "institution_id", "created_at"),
        Index("ix_audit_logs_entity_entity_id", "entity", "entity_id"),
    )

    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="SET NULL")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(80))
    entity: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str | None] = mapped_column(String(80))
    meta: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def record_audit(
    db: Session,
    *,
    action: str,
    entity: str,
    entity_id: str | None = None,
    actor_id: uuid.UUID | None = None,
    institution_id: uuid.UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Adds the row to the session; the caller's transaction commits it."""
    entry = AuditLog(
        action=action,
        entity=entity,
        entity_id=entity_id,
        actor_id=actor_id,
        institution_id=institution_id,
        meta=meta or {},
    )
    db.add(entry)
    return entry
