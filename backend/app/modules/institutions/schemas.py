"""Institution representations (frontend domain.ts `AdminInstitution` subset).

Counts and tier live on the admin console shapes and arrive with the analytics
module; only the identity fields exist in Phase 2.

Phase 14 added the console's own shapes — `AdminInstitutionOut` (identity plus
the ecosystem counts the owning modules supply), `InstitutionUpdate` (the
editable subset) and `CampusMetricOut` (one public figure).
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class InstitutionPrincipalOut(BaseModel):
    """domain.ts `InstitutionPrincipal` — the principal named on the institution.

    `verified` is `institutions.principal_verified`. No route sets it true:
    verifying an identity against the institutional domain is a workflow that
    does not exist yet, so the flag only ever falls (see `service.update`).
    """

    name: str
    email: str
    verified: bool


class AdminInstitutionOut(InstitutionOut):
    """domain.ts `AdminInstitution` — the identity above plus its ecosystem.

    The four counts are not this module's facts. Each is asked of the module
    that owns the thing counted, through the same accessor the principal
    dashboard already reads, so the console and the dashboard cannot disagree.
    """

    # Null until a principal is named on the institution.
    principal: InstitutionPrincipalOut | None = None
    # users.repository.counts_by_role
    students: int
    faculty: int
    # projects.repository.counts_by_completion, both halves — the console counts
    # the institution's projects, not just the live ones.
    projects: int
    # credits.repository.institution_total — SUM(points), netted of corrections.
    credits: int


class InstitutionUpdate(BaseModel):
    """domain.ts `InstitutionInput` — the admin-editable subset, and only it.

    Absent on purpose, and unreachable through this route:

    - `id` — the tenant key. Nothing may rewrite it (ADR-2, ADR-9).
    - `status` — ACTIVE/PENDING/SUSPENDED gates authentication (ADR-9). An
      institution admin suspending their own institution would lock themselves
      and everyone else out of the deployment; it is a platform-operator action
      and this deployment has no platform operator.
    - `tier` — assigned by whoever sells the licence, not by the licensee.
    - `principal_verified` — see `InstitutionPrincipalOut`.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    full_name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=40)
    type: str = Field(min_length=1, max_length=80)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    website: str | None = Field(default=None, max_length=255)
    support_email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    principal_name: str | None = Field(default=None, max_length=160)
    principal_email: EmailStr | None = None


class CampusMetricOut(BaseModel):
    """domain.ts `NameValue` — one figure on the public campus-impact bar."""

    label: str
    value: int
