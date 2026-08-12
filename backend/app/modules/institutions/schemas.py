"""Institution representations (frontend domain.ts `AdminInstitution` subset).

Counts and tier live on the admin console shapes and arrive with the analytics
module; only the identity fields exist in Phase 2.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.common.enums import InstitutionStatus


class InstitutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    full_name: str
    code: str
    type: str
    city: str
    state: str
    website: str | None = None
    support_email: EmailStr | None = None
    address: str | None = None
    status: InstitutionStatus
    tier: str | None = None
