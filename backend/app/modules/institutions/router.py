"""Institution reads.

`/institutions/{institution_id}` exists to make the tenant boundary explicit and
testable: any id other than the caller's own resolves to 404, whatever the
caller's role.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.common.envelope import ok
from app.common.errors import NotFoundError
from app.core.deps import CurrentUser, DbSession
from app.modules.institutions import repository
from app.modules.institutions.schemas import InstitutionOut

router = APIRouter(prefix="/institutions", tags=["institutions"])


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
