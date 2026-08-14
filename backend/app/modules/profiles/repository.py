"""Profile data access.

Both lookups take the owner's id, which the caller reads from the token — there
is no query that can return someone else's profile, so there is nothing here for
a forged parameter to reach. No function commits.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.profiles.models import FacultyProfile, StudentProfile


def student(db: Session, user_id: uuid.UUID) -> StudentProfile | None:
    stmt = select(StudentProfile).where(StudentProfile.user_id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def faculty(db: Session, user_id: uuid.UUID) -> FacultyProfile | None:
    stmt = select(FacultyProfile).where(FacultyProfile.user_id == user_id)
    return db.execute(stmt).scalar_one_or_none()
