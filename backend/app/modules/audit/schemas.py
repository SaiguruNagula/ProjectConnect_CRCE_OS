"""Audit read schema (Phase 12).

The action code travels as written — `review.approved`, `login.failed`. It is
not turned into a sentence here: the wording, the tense and the icon are
presentation, and two different pages already phrase the same action
differently.

`metadata` does not travel at all. It holds the identifiers the writing module
needed for forensics, and none of the surfaces reading this endpoint display
them, so shipping them to a browser would widen the blast radius of the audit
log for nothing.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditEntryOut(BaseModel):
    id: uuid.UUID
    action: str
    entity: str
    entity_id: str | None = None
    # Empty when the actor's row is gone: `audit_logs.actor_id` is ON DELETE SET
    # NULL, because the record of what happened outlives the account.
    actor_name: str
    created_at: datetime
