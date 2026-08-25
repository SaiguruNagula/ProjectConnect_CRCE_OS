"""Dashboard routes (Phases 6, 8 and 11).

Three reads, and none takes a parameter. "My dashboard" means the token's
subject; there is deliberately no `/dashboard/{userId}` and no
`?institution_id=`, because these counters are the caller's own and nothing in
the product asks to see someone else's.

Each route admits one role. A faculty member has no student dashboard to read
and a student has no faculty one, so the roles are not a filter inside a shared
handler — they are three endpoints. The principal's is not the admin's either:
the admin directory stays admin-exclusive, and this reads counts, not people.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.core.deps import DbSession, require_role
from app.modules.dashboard import service
from app.modules.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

Student = Annotated[User, Depends(require_role(UserRole.STUDENT))]
Faculty = Annotated[User, Depends(require_role(UserRole.FACULTY))]
Principal = Annotated[User, Depends(require_role(UserRole.PRINCIPAL))]


@router.get("/student")
def student_dashboard(current_user: Student, db: DbSession) -> dict[str, object]:
    return ok(service.student(db, current_user), "Dashboard loaded.")


@router.get("/faculty")
def faculty_dashboard(current_user: Faculty, db: DbSession) -> dict[str, object]:
    return ok(service.faculty(db, current_user), "Dashboard loaded.")


@router.get("/principal")
def principal_dashboard(current_user: Principal, db: DbSession) -> dict[str, object]:
    """The caller's institution, counted. The institution is the token's."""
    return ok(service.principal(db, current_user), "Dashboard loaded.")
