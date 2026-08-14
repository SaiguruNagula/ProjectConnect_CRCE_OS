"""Profile routes.

Four, and the frozen frontend names all four: `repositories/mock/index.ts`
annotates `ProfileRepository` with `/students/me/profile` and
`FacultyProfileRepository` with `/faculty/me/profile`, get and patch each.

`me` is not a placeholder for an id — there is no path that takes one. A student
reads and edits their own profile and no other, which is why nothing below needs
an ownership check: the subject *is* the token.

Two routes the same file names are deliberately absent.
`GET /faculty/me/reputation` returns invented scores (review quality, mentorship
score, innovation contribution) that no canonical source produces; inventing a
second scoring system beside the Credit Engine is exactly what ADR-5 forbids.
`GET|PATCH /portfolio/me/customization` curates research, hackathons and
credentials that have no backend owner, behind a `published` flag for a public
portfolio route that does not exist.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.core.deps import DbSession, require_role
from app.modules.profiles import service
from app.modules.profiles.schemas import FacultyProfileIn, StudentProfileIn
from app.modules.users.models import User

router = APIRouter(tags=["profiles"])

Student = Annotated[User, Depends(require_role(UserRole.STUDENT))]
Faculty = Annotated[User, Depends(require_role(UserRole.FACULTY))]


@router.get("/students/me/profile")
def my_student_profile(current_user: Student, db: DbSession) -> dict[str, object]:
    return ok(service.student(db, current_user), "Profile loaded.")


@router.patch("/students/me/profile")
def update_my_student_profile(
    payload: StudentProfileIn, current_user: Student, db: DbSession
) -> dict[str, object]:
    return ok(service.update_student(db, current_user, payload), "Profile updated.")


@router.get("/faculty/me/profile")
def my_faculty_profile(current_user: Faculty, db: DbSession) -> dict[str, object]:
    return ok(service.faculty(db, current_user), "Profile loaded.")


@router.patch("/faculty/me/profile")
def update_my_faculty_profile(
    payload: FacultyProfileIn, current_user: Faculty, db: DbSession
) -> dict[str, object]:
    return ok(service.update_faculty(db, current_user, payload), "Profile updated.")
