"""Institution data access."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.enums import InstitutionStatus
from app.modules.institutions.models import Institution


def get_by_id(db: Session, institution_id: uuid.UUID) -> Institution | None:
    return db.get(Institution, institution_id)


def get_by_code(db: Session, code: str) -> Institution | None:
    stmt = select(Institution).where(Institution.code == code)
    return db.execute(stmt).scalar_one_or_none()


def active(db: Session) -> list[Institution]:
    """Every ACTIVE institution in this deployment, by name.

    This module owns `status`, so it owns the question of which institutions
    count. Under ADR-9 a deployment holds one institution and this returns one
    row; nothing here assumes that, because nothing in the codebase ever has.

    The only caller is the public campus-impact aggregate, which reports counts
    and no identities — a PENDING or SUSPENDED institution cannot authenticate
    and does not appear in it.
    """
    stmt = (
        select(Institution)
        .where(Institution.status == InstitutionStatus.ACTIVE)
        .order_by(Institution.name)
    )
    return list(db.execute(stmt).scalars())


def code_taken(db: Session, code: str, *, exclude_id: uuid.UUID) -> bool:
    """Is `code` already another institution's? `institutions.code` is UNIQUE.

    Checked before the write so a rename collides with a 409 rather than an
    IntegrityError, which the error handler would report as a 500.
    """
    stmt = select(Institution.id).where(
        Institution.code == code, Institution.id != exclude_id
    )
    return db.execute(stmt).first() is not None
