"""Audit routes (Phase 12).

Two reads, both scoped to the caller's own institution by the token. Neither
takes an `?institution_id=`, and there is no route that reads the log across
institutions — that would be a platform-operator surface, and the platform
operator role does not exist before Phase 14.

The two feeds are separate endpoints rather than one endpoint with a filter
because they are not the same permission. Staff can see what the institution
built; only an admin can see who failed to sign in. Collapsing them into
`/audit?kind=` would put that distinction in a query parameter, which is the
wrong place for it.

Students read neither. Everything in the activity feed is already visible to a
student through the module that owns it, but as *their* view of it — a feed of
everyone's actions is a staff surface, and no student page asks for one.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.core.deps import DbSession, require_role
from app.modules.audit import service
from app.modules.users.models import User

router = APIRouter(prefix="/audit", tags=["audit"])

Staff = Annotated[
    User, Depends(require_role(UserRole.FACULTY, UserRole.ADMIN, UserRole.PRINCIPAL))
]
Admin = Annotated[User, Depends(require_role(UserRole.ADMIN))]


@router.get("/activity")
def activity(current_user: Staff, db: DbSession) -> dict[str, object]:
    return ok(service.activity(db, current_user), "Activity loaded.")


@router.get("/users")
def user_audit(current_user: Admin, db: DbSession) -> dict[str, object]:
    """Identity history for the Admin access-and-identity panel."""
    return ok(service.identity(db, current_user), "Audit log loaded.")
