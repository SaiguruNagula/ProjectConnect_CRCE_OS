"""Reads over `audit_logs`. This module never writes one.

The table and its writer belong to `common/audit.py`, where every module already
calls `record_audit()` inside its own transaction. Phase 12 adds no new audit
row and changes no existing one — it only gives the two UI surfaces that were
built to show this history a way to read it.

Institution scoping is a `WHERE`, not a filter applied after the fetch, so a
foreign row is never loaded in the first place.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.common.audit import AuditLog
from app.modules.users.models import User

# What the panels show. Both feeds are recent history, not an archive: nothing
# in the UI pages through them, and an unbounded audit query is the kind that
# gets slower every month it runs.
FEED_LIMIT = 30

# Authentication and session events. They are the identity story — who signed
# in, who was refused — and they are the only actions the Admin user-management
# panel is about. Kept as prefixes so a new `login.*` action joins the right
# feed without anyone remembering to add it here.
IDENTITY_PREFIXES = ("login.", "logout", "token.")


def _scoped(institution_id: uuid.UUID) -> Select[tuple[AuditLog, str | None]]:
    return (
        select(AuditLog, User.name)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .where(AuditLog.institution_id == institution_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(FEED_LIMIT)
    )


def _identity_match() -> object:
    return or_(*(AuditLog.action.startswith(prefix) for prefix in IDENTITY_PREFIXES))


def list_activity(db: Session, institution_id: uuid.UUID) -> Sequence[tuple[AuditLog, str | None]]:
    """Business history: everything the institution's people did to its domain.

    Authentication events are excluded. A "recent activity" rail is about work,
    and a failed sign-in is a security fact that belongs to the admin surface.
    """
    stmt = _scoped(institution_id).where(~_identity_match())
    return db.execute(stmt).all()


def list_identity(db: Session, institution_id: uuid.UUID) -> Sequence[tuple[AuditLog, str | None]]:
    """Authentication and session history for the institution."""
    stmt = _scoped(institution_id).where(_identity_match())
    return db.execute(stmt).all()
