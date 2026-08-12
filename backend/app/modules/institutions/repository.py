"""Institution data access."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.institutions.models import Institution


def get_by_id(db: Session, institution_id: uuid.UUID) -> Institution | None:
    return db.get(Institution, institution_id)


def get_by_code(db: Session, code: str) -> Institution | None:
    stmt = select(Institution).where(Institution.code == code)
    return db.execute(stmt).scalar_one_or_none()
