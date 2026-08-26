"""Audit read model (Phase 12). Composition only — no audit row is written here."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.common.audit import AuditLog
from app.common.enums import UserRole
from app.modules.audit import repository as repo
from app.modules.audit.schemas import AuditEntryOut
from app.modules.problems import repository as problems_repo
from app.modules.projects import repository as projects_repo
from app.modules.users.models import User


def _out(rows: Sequence[tuple[AuditLog, str | None]]) -> list[AuditEntryOut]:
    return [
        AuditEntryOut(
            id=row.id,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            actor_name=actor_name or "",
            created_at=row.created_at,
        )
        for row, actor_name in rows
    ]


def activity(db: Session, user: User) -> list[AuditEntryOut]:
    """The institution's recent work, personalized for the caller's role.

    Admin and Principal hold institution-wide product scope, so their feed
    stays unfiltered. Faculty do not: their dashboard's "recent activity" is
    about their own problems and projects, not every other mentor's.
    """
    if user.role is UserRole.FACULTY:
        problem_ids = problems_repo.ids_by_author(
            db, institution_id=user.institution_id, author_id=user.id
        )
        project_ids = [
            p.id
            for p in projects_repo.list_for_mentor(
                db, institution_id=user.institution_id, mentor_id=user.id
            )
        ]
        return _out(
            repo.list_faculty_activity(
                db,
                user.institution_id,
                faculty_id=user.id,
                owned_ids=[*problem_ids, *project_ids],
            )
        )
    return _out(repo.list_activity(db, user.institution_id))


def identity(db: Session, user: User) -> list[AuditEntryOut]:
    """The institution's recent sign-in and session events."""
    return _out(repo.list_identity(db, user.institution_id))
