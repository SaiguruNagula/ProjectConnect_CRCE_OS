"""Profile reads and edits.

The caller is always the subject: every function takes the `User` the token
resolved to and touches that user's row and nothing else. No function accepts a
user id, an institution id or a role from anywhere but `CurrentUser`, so there
is no parameter here for a client to forge.

What a profile owns: name, department, and the role-specific identity fields.
What it does not own, and never writes: credits, rank, badges, projects,
submissions, reviews, publication state. Those modules read profile data; this
one never reads back.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.common.enums import FacultyVisibility
from app.common.errors import AuthorizationError
from app.modules.profiles import repository as repo
from app.modules.profiles.models import FacultyProfile, StudentProfile
from app.modules.profiles.schemas import (
    FacultyProfileIn,
    FacultyProfileOut,
    StudentProfileIn,
    StudentProfileOut,
    VisibilityOut,
)
from app.modules.teams.schemas import initials
from app.modules.users.models import User

# The patch fields that map straight onto the profile row. Anything outside
# these tuples is either owned by `users`, derived, or not settable at all.
_STUDENT_FIELDS = (
    "headline",
    "tagline",
    "bio",
    "batch",
    "roll_number",
    "pronouns",
    "location",
    "github",
    "linkedin",
    "personal_skills",
)
_FACULTY_FIELDS = (
    "designation",
    "phone",
    "bio",
    "teaching_focus",
    "innovation_focus",
    "office_location",
    "experience_years",
    "research_domains",
    "skills",
    "max_teams",
    "open_for_mentorship",
    "visibility",
    "github",
    "linkedin",
)


def _blank_student() -> StudentProfile:
    """A profile nobody has filled in yet — the column defaults, unflushed.

    Reads use it so a `GET` never has to write a row, and the first `PATCH`
    persists this same instance rather than a second empty one.
    """
    return StudentProfile(
        personal_skills=[], public_profile=False, show_contact=False, show_socials=False
    )


def _blank_faculty() -> FacultyProfile:
    return FacultyProfile(
        experience_years=0,
        research_domains=[],
        skills=[],
        max_teams=1,
        open_for_mentorship=True,
        visibility=FacultyVisibility.INSTITUTIONAL,
    )


def _student_out(user: User, row: StudentProfile) -> StudentProfileOut:
    return StudentProfileOut(
        user_id=user.id,
        name=user.name,
        avatar_initials=initials(user.name),
        institutional_email=user.email,
        department=user.department,
        visibility=VisibilityOut.model_validate(row),
        **{field: getattr(row, field) for field in _STUDENT_FIELDS},
    )


def _faculty_out(user: User, row: FacultyProfile) -> FacultyProfileOut:
    return FacultyProfileOut(
        user_id=user.id,
        name=user.name,
        avatar_initials=initials(user.name),
        email=user.email,
        department=user.department,
        faculty_id=row.faculty_id,
        **{field: getattr(row, field) for field in _FACULTY_FIELDS},
    )


def _apply_shared(user: User, changes: dict[str, Any]) -> None:
    """Move the fields `users` owns off the patch and onto the user row.

    `avatar_initials` is dropped: it is the initials of the name, so honouring a
    stale copy from an edit form would contradict a rename made in the same save.
    """
    changes.pop("avatar_initials", None)
    if "name" in changes:
        user.name = changes.pop("name")
    if "department" in changes:
        # "" clears the field rather than storing an empty department.
        user.department = changes.pop("department") or None


def student(db: Session, user: User) -> StudentProfileOut:
    return _student_out(user, repo.student(db, user.id) or _blank_student())


def faculty(db: Session, user: User) -> FacultyProfileOut:
    return _faculty_out(user, repo.faculty(db, user.id) or _blank_faculty())


def update_student(db: Session, user: User, patch: StudentProfileIn) -> StudentProfileOut:
    """Absent fields are left alone; a field sent as null is cleared."""
    changes = patch.model_dump(exclude_unset=True)
    _apply_shared(user, changes)

    row = repo.student(db, user.id)
    if row is None:
        row = _blank_student()
        row.user_id = user.id
        db.add(row)

    visibility = changes.pop("visibility", None)
    if visibility is not None:
        row.public_profile = visibility["public_profile"]
        row.show_contact = visibility["show_contact"]
        row.show_socials = visibility["show_socials"]
    # Driven by the field list, not by the payload: a key with no column would
    # otherwise become a plain Python attribute and be quietly forgotten.
    for field in _STUDENT_FIELDS:
        if field in changes:
            setattr(row, field, changes[field])

    db.commit()
    db.refresh(row)
    db.refresh(user)
    return _student_out(user, row)


def update_faculty(db: Session, user: User, patch: FacultyProfileIn) -> FacultyProfileOut:
    if patch.email is not None and patch.email.lower() != user.email:
        # The address is the login credential, not a profile field. Changing it
        # is an administrative act, and this phase implements no such route.
        raise AuthorizationError("Your account email cannot be changed here.")

    changes = patch.model_dump(exclude_unset=True)
    changes.pop("email", None)
    _apply_shared(user, changes)

    row = repo.faculty(db, user.id)
    if row is None:
        row = _blank_faculty()
        row.user_id = user.id
        db.add(row)

    for field in _FACULTY_FIELDS:
        if field in changes:
            setattr(row, field, changes[field])

    db.commit()
    db.refresh(row)
    db.refresh(user)
    return _faculty_out(user, row)
