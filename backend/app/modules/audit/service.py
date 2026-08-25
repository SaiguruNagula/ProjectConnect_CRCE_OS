"""Audit read model (Phase 12). Composition only — no audit row is written here."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.common.audit import AuditLog
from app.modules.audit import repository as repo
from app.modules.audit.schemas import AuditEntryOut
from app.modules.users.models import User


def _out(rows: Sequence[tuple[AuditLog, str | None]]) -> list[AuditEntryOut]:
    return [
        AuditEntryOut(
            id=row.id,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            actor_name=actor_name or "",
            created_at=row.created_at,
        )
        for row, actor_name in rows
    ]


def activity(db: Session, user: User) -> list[AuditEntryOut]:
    """The institution's recent work. The institution is the token's."""
    return _out(repo.list_activity(db, user.institution_id))


def identity(db: Session, user: User) -> list[AuditEntryOut]:
    """The institution's recent sign-in and session events."""
    return _out(repo.list_identity(db, user.institution_id))
