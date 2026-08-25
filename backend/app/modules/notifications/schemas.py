"""Notification response schema (Phase 12).

`kind` is the module's own reading of the outcome, not a colour, and `entity` /
`entity_id` are what the row is about, not where to go. Both stay semantic here
so the frontend keeps ownership of tone styling and routing.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    message: str
    entity: str | None = None
    entity_id: str | None = None
    read: bool
    created_at: datetime
