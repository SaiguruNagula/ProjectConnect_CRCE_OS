"""Problem data access. Every statement is institution-scoped.

The catalog is one query: the two counters the cards show are correlated
aggregates, and the caller's bookmark and application arrive as outer joins.
Computing them per row in Python would be N+1 against the largest list in the
product. Team and application models are read here (never their repositories) —
cross-module *calls* go service → service.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from math import ceil

from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.orm import Session

from app.common.enums import ApplicationStatus, ProblemSuggestionStatus, UserRole, UserStatus
from app.modules.problems.models import (
    Problem,
    ProblemBookmark,
    ProblemDraft,
    ProblemSuggestion,
)
from app.modules.projects.models import Application, Project
from app.modules.teams.models import Team, TeamMember
from app.modules.users.models import User


@dataclass(frozen=True)
class CatalogRow:
    """A problem plus everything the read model derives around it."""

    problem: Problem
    faculty_name: str
    applicants_count: int
    team_count: int
    solutions_count: int
    bookmarked: bool
    applied: bool
    application_team_id: uuid.UUID | None


@dataclass(frozen=True)
class CatalogStats:
    problems: int
    departments: int
    teams: int


def _applicants_subquery() -> ColumnElement[int]:
    return (
        select(func.count())
        .select_from(Application)
        .where(
            Application.problem_id == Problem.id,
            Application.status == ApplicationStatus.ACTIVE,
        )
        .correlate(Problem)
        .scalar_subquery()
    )


def _team_count_subquery() -> ColumnElement[int]:
    return (
        select(func.count())
        .select_from(Team)
        .where(Team.problem_id == Problem.id, Team.deleted_at.is_(None))
        .correlate(Problem)
        .scalar_subquery()
    )


def _solutions_subquery() -> ColumnElement[int]:
    """Solutions Hub entries answering this problem — published, not deleted.

    The Hub owns no table of its own, so the count is over `projects` and uses
    exactly the eligibility the Hub itself reads.
    """
    return (
        select(func.count())
        .select_from(Project)
        .where(
            Project.problem_id == Problem.id,
            Project.published.is_(True),
            Project.deleted_at.is_(None),
        )
        .correlate(Problem)
        .scalar_subquery()
    )


def _catalog_select(institution_id: uuid.UUID, viewer_id: uuid.UUID) -> Select:
    return (
        select(
            Problem,
            User.name,
            _applicants_subquery(),
            _team_count_subquery(),
            _solutions_subquery(),
            ProblemBookmark.problem_id.is_not(None),
            Application.id.is_not(None),
            Application.team_id,
        )
        .join(User, User.id == Problem.created_by)
        .outerjoin(
            ProblemBookmark,
            (ProblemBookmark.problem_id == Problem.id)
            & (ProblemBookmark.student_id == viewer_id),
        )
        .outerjoin(
            Application,
            (Application.problem_id == Problem.id)
            & (Application.status == ApplicationStatus.ACTIVE)
            # The caller's own application, or the one their team lead filed:
            # every member of an applied team sees the problem as applied.
            & (
                (Application.student_id == viewer_id)
                | Application.team_id.in_(
                    select(TeamMember.team_id).where(TeamMember.student_id == viewer_id)
                )
            ),
        )
        .where(Problem.institution_id == institution_id, Problem.deleted_at.is_(None))
    )


def _row(record) -> CatalogRow:
    (
        problem,
        faculty_name,
        applicants,
        teams,
        solutions,
        bookmarked,
        applied,
        application_team_id,
    ) = record
    return CatalogRow(
        problem=problem,
        faculty_name=faculty_name,
        applicants_count=applicants,
        team_count=teams,
        solutions_count=solutions,
        bookmarked=bool(bookmarked),
        applied=bool(applied),
        application_team_id=application_team_id,
    )


def catalog_page(
    db: Session,
    *,
    institution_id: uuid.UUID,
    viewer_id: uuid.UUID,
    page: int,
    limit: int,
    search: str | None,
    department: str | None,
    saved_only: bool,
    sort: str | None,
) -> tuple[list[CatalogRow], int, int, int]:
    """Returns (rows, total, served page, total pages) with the page clamped."""
    stmt = _catalog_select(institution_id, viewer_id)

    if department:
        stmt = stmt.where(Problem.department == department)
    if saved_only:
        stmt = stmt.where(ProblemBookmark.problem_id.is_not(None))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Problem.title).like(term),
                func.lower(Problem.summary).like(term),
                func.lower(Problem.department).like(term),
                func.lower(User.name).like(term),
            )
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    total_pages = max(1, ceil(total / limit)) if total else 1
    served_page = min(max(1, page), total_pages)

    order = (
        Problem.base_credits.desc()
        if sort == "credits"
        else Problem.created_at.desc()
    )
    rows = db.execute(
        stmt.order_by(order, Problem.id).limit(limit).offset((served_page - 1) * limit)
    ).all()
    return [_row(row) for row in rows], total, served_page, total_pages


def get_row(
    db: Session, problem_id: uuid.UUID, *, institution_id: uuid.UUID, viewer_id: uuid.UUID
) -> CatalogRow | None:
    stmt = _catalog_select(institution_id, viewer_id).where(Problem.id == problem_id)
    record = db.execute(stmt).one_or_none()
    return _row(record) if record else None


def get(db: Session, problem_id: uuid.UUID, *, institution_id: uuid.UUID) -> Problem | None:
    stmt = select(Problem).where(
        Problem.id == problem_id,
        Problem.institution_id == institution_id,
        Problem.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def departments(db: Session, institution_id: uuid.UUID) -> list[str]:
    stmt = (
        select(Problem.department)
        .where(Problem.institution_id == institution_id, Problem.deleted_at.is_(None))
        .distinct()
        .order_by(Problem.department)
    )
    return list(db.execute(stmt).scalars().all())


def stats(db: Session, institution_id: uuid.UUID) -> CatalogStats:
    """Headline counters over the whole catalog — never the filtered page."""
    scope = (Problem.institution_id == institution_id, Problem.deleted_at.is_(None))
    problems, department_count = db.execute(
        select(func.count(Problem.id), func.count(func.distinct(Problem.department))).where(*scope)
    ).one()
    with_teams = db.execute(
        select(func.count(func.distinct(Team.problem_id)))
        .select_from(Team)
        .join(Problem, Problem.id == Team.problem_id)
        .where(Team.deleted_at.is_(None), *scope)
    ).scalar_one()
    return CatalogStats(problems=problems, departments=department_count, teams=with_teams)


def add(db: Session, problem: Problem) -> Problem:
    db.add(problem)
    db.flush()
    return problem


# --- drafts ------------------------------------------------------------------


def add_draft(db: Session, draft: ProblemDraft) -> ProblemDraft:
    db.add(draft)
    db.flush()
    return draft


def list_drafts(
    db: Session, *, institution_id: uuid.UUID, author_id: uuid.UUID
) -> Sequence[ProblemDraft]:
    stmt = (
        select(ProblemDraft)
        .where(
            ProblemDraft.institution_id == institution_id,
            ProblemDraft.created_by == author_id,
        )
        .order_by(ProblemDraft.updated_at.desc())
    )
    return db.execute(stmt).scalars().all()


# --- bookmarks ---------------------------------------------------------------


def get_bookmark(
    db: Session, *, student_id: uuid.UUID, problem_id: uuid.UUID
) -> ProblemBookmark | None:
    return db.get(ProblemBookmark, {"student_id": student_id, "problem_id": problem_id})


def add_bookmark(db: Session, *, student_id: uuid.UUID, problem_id: uuid.UUID) -> None:
    db.add(ProblemBookmark(student_id=student_id, problem_id=problem_id))
    db.flush()


def remove_bookmark(db: Session, bookmark: ProblemBookmark) -> None:
    db.delete(bookmark)
    db.flush()


# --- mentors and suggestions --------------------------------------------------


def list_mentors(db: Session, institution_id: uuid.UUID) -> Sequence[User]:
    stmt = (
        select(User)
        .where(
            User.institution_id == institution_id,
            User.role == UserRole.FACULTY,
            User.status == UserStatus.ACTIVE,
            User.deleted_at.is_(None),
        )
        .order_by(User.name)
    )
    return db.execute(stmt).scalars().all()


def get_suggestion(
    db: Session, suggestion_id: uuid.UUID, *, institution_id: uuid.UUID
) -> ProblemSuggestion | None:
    stmt = select(ProblemSuggestion).where(
        ProblemSuggestion.id == suggestion_id,
        ProblemSuggestion.institution_id == institution_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def list_suggestions_for_student(
    db: Session, *, institution_id: uuid.UUID, student_id: uuid.UUID
) -> Sequence[ProblemSuggestion]:
    stmt = (
        select(ProblemSuggestion)
        .where(
            ProblemSuggestion.institution_id == institution_id,
            ProblemSuggestion.student_id == student_id,
        )
        .order_by(ProblemSuggestion.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


def list_suggestions_for_mentor(
    db: Session, *, institution_id: uuid.UUID, mentor_id: uuid.UUID
) -> Sequence[ProblemSuggestion]:
    """A mentor sees what was sent to them — never another student's draft."""
    stmt = (
        select(ProblemSuggestion)
        .where(
            ProblemSuggestion.institution_id == institution_id,
            ProblemSuggestion.mentor_id == mentor_id,
            ProblemSuggestion.status != ProblemSuggestionStatus.DRAFT,
        )
        .order_by(ProblemSuggestion.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


def add_suggestion(db: Session, suggestion: ProblemSuggestion) -> ProblemSuggestion:
    db.add(suggestion)
    db.flush()
    return suggestion


def names_by_id(db: Session, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    """One lookup for the display names a list of suggestions needs."""
    if not user_ids:
        return {}
    rows = db.execute(select(User.id, User.name).where(User.id.in_(user_ids))).all()
    return {row[0]: row[1] for row in rows}
