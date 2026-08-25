"""The admin directory (Phase 10).

The users module owns identity; it does not own credits or projects, so the two
numbers a directory row shows are asked of the modules that do — in one batched
call each, not once per row. This file composes their answers; it computes
neither.

Everything here is scoped to the caller's own institution. There is no
cross-institution read in the platform, and this is not the place to invent one.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.common.enums import UserRole, UserStatus
from app.common.pagination import PageParams, Paginated, paginate
from app.modules.credits import repository as credits_repo
from app.modules.institutions import repository as institutions_repo
from app.modules.projects import repository as projects_repo
from app.modules.users import repository
from app.modules.users.models import User
from app.modules.users.schemas import DirectoryUserOut, UsersOverviewOut


def directory(
    db: Session, *, institution_id: uuid.UUID, params: PageParams
) -> Paginated[DirectoryUserOut]:
    rows, total = repository.list_by_institution(
        db, institution_id, limit=params.limit, offset=params.offset
    )
    # One tenant per token, so one name for every row on the page.
    institution = institutions_repo.get_by_id(db, institution_id)
    institution_name = institution.name if institution else ""

    credits = credits_repo.balances_of(db, {row.id for row in rows})
    projects = _project_counts(db, institution_id=institution_id, rows=rows)

    items = [
        DirectoryUserOut(
            id=row.id,
            name=row.name,
            email=row.email,
            role=row.role,
            status=row.status,
            department=row.department,
            institution=institution_name,
            credits=credits.get(row.id, 0),
            projects=projects.get(row.id, 0),
        )
        for row in rows
    ]
    return paginate(items, total, params)


def overview(db: Session, *, institution_id: uuid.UUID) -> UsersOverviewOut:
    by_role = repository.counts_by_role(db, institution_id)
    by_status = repository.counts_by_status(db, institution_id)
    return UsersOverviewOut(
        total=sum(by_role.values()),
        students=by_role.get(UserRole.STUDENT, 0),
        faculty=by_role.get(UserRole.FACULTY, 0),
        principals=by_role.get(UserRole.PRINCIPAL, 0),
        pending=by_status.get(UserStatus.PENDING, 0),
        suspended=by_status.get(UserStatus.SUSPENDED, 0),
    )


def _project_counts(
    db: Session, *, institution_id: uuid.UUID, rows: Sequence[User]
) -> dict[uuid.UUID, int]:
    """What a project is to a person depends on their role: mentored, or worked on.

    Admins and principals appear in neither query and so count zero — they are
    not absent from the directory, they simply have no projects of their own.
    """
    by_role: dict[UserRole, set[uuid.UUID]] = {UserRole.STUDENT: set(), UserRole.FACULTY: set()}
    for row in rows:
        if row.role in by_role:
            by_role[row.role].add(row.id)

    counts = projects_repo.counts_for_students(
        db, institution_id=institution_id, student_ids=by_role[UserRole.STUDENT]
    )
    counts.update(
        projects_repo.counts_for_mentors(
            db, institution_id=institution_id, mentor_ids=by_role[UserRole.FACULTY]
        )
    )
    return counts
