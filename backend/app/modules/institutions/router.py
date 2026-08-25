"""Institution reads, institution self-service, and the public campus aggregate.

`/institutions/{institution_id}` exists to make the tenant boundary explicit and
testable: any id other than the caller's own resolves to 404, whatever the
caller's role.

Phase 14 added the console's two verbs. Both are self-service under ADR-9: the
directory is the caller's own institution and the update writes the caller's own
row. Neither takes an institution id, so neither can be pointed at another
tenant. There is deliberately no create, no status change and no platform-wide
read — those are control-plane operations and ADR-9 has no control plane.

`public_router` is mounted here rather than in a module of its own because the
campus aggregate is a fact about the institutions this module owns. It keeps the
`/analytics` prefix the frozen frontend contract names, and it is the only
anonymous route in the application outside `/health` and `/auth`.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.common.errors import NotFoundError
from app.core.deps import CurrentUser, DbSession, require_role
from app.modules.institutions import repository, service
from app.modules.institutions.schemas import InstitutionOut, InstitutionUpdate
from app.modules.users.models import User

router = APIRouter(prefix="/institutions", tags=["institutions"])

# ADMIN only, matching the rest of the admin console (§7). A principal reads
# their institution's *numbers* through `GET /dashboard/principal`; editing the
# institution's profile is an administrative act, not an executive one.
InstitutionAdmin = Annotated[User, Depends(require_role(UserRole.ADMIN))]


@router.get("")
def list_institutions(current_user: InstitutionAdmin, db: DbSession) -> dict[str, object]:
    """The console directory — one row, the caller's own institution (ADR-9)."""
    return ok(service.directory(db, current_user), "Institutions loaded.")


@router.patch("/me")
def update_my_institution(
    payload: InstitutionUpdate, current_user: InstitutionAdmin, db: DbSession
) -> dict[str, object]:
    """Edit the caller's own institution profile. `/me` is the only target."""
    return ok(service.update(db, current_user, payload), "Institution updated.")


@router.get("/me")
def my_institution(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    institution = repository.get_by_id(db, current_user.institution_id)
    if institution is None:
        # The FK makes this unreachable; deny rather than return a null tenant.
        raise NotFoundError("Institution not found.")
    return ok(InstitutionOut.model_validate(institution), "Institution loaded.")


@router.get("/{institution_id}")
def get_institution(
    institution_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> dict[str, object]:
    if institution_id != current_user.institution_id:
        # 404, not 403 — the caller must not learn the id belongs to a real tenant.
        raise NotFoundError("Institution not found.")
    return my_institution(current_user, db)


public_router = APIRouter(prefix="/analytics", tags=["analytics"])


@public_router.get("/campus-impact")
def campus_impact(db: DbSession) -> dict[str, object]:
    """Public headline counts for the Landing, About and Innovation Hub pages.

    Intentionally anonymous: these are the figures the institution publishes
    about itself on its own marketing pages, and the pages that draw them render
    before anyone has logged in.

    What it exposes: four integers — students, faculty, completed projects and
    total credits — aggregated over ACTIVE institutions. What it cannot expose,
    by construction rather than by filtering: any name, address, department,
    project, problem, team, review, notification, audit row or per-person
    credit. `service.campus_impact` returns `list[CampusMetricOut]` and
    `CampusMetricOut` is a label and an int.
    """
    return ok(service.campus_impact(db), "Campus impact loaded.")
