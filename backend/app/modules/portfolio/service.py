"""The portfolio read model (BACKEND_ARCHITECTURE.md §22).

A portfolio owns no facts. It composes them: identity from `users`, verified
work from `projects`, contribution from the Credit Engine ledger, and — for a
mentor — the problems and reviews they were paid for. Nothing here re-scores,
re-ranks or re-counts anything another module already decides.

`GET /credits/summary` and this endpoint therefore cannot disagree: both read
`credits.repository.balance` and label it with `credits.config.level_of`.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.modules.credits import config
from app.modules.credits import repository as credits_repo
from app.modules.portfolio import repository as repo
from app.modules.portfolio.schemas import PortfolioOut, PortfolioStatsOut
from app.modules.projects import service as projects
from app.modules.teams.schemas import initials
from app.modules.users.models import User


def _stats(db: Session, user: User, projects_completed: int) -> PortfolioStatsOut:
    faculty = user.role is UserRole.FACULTY
    scope = {"institution_id": user.institution_id, "user_id": user.id}
    return PortfolioStatsOut(
        projects_completed=projects_completed,
        verified_solutions=repo.published_projects(db, role=user.role, **scope),
        problems_published=repo.problems_published(db, **scope) if faculty else None,
        reviews_completed=repo.reviews_completed(db, **scope) if faculty else None,
    )


def me(db: Session, user: User) -> PortfolioOut:
    """The caller's own portfolio. There is no other institution to reach: every
    query below is scoped by the token's institution and user id."""
    completed = repo.completed_projects(
        db, institution_id=user.institution_id, user_id=user.id, role=user.role
    )
    total = credits_repo.balance(db, user.id)
    level, level_name, _next_name, _milestone = config.level_of(total)

    return PortfolioOut(
        user_id=user.id,
        name=user.name,
        role=user.role,
        email=user.email,
        avatar_initials=initials(user.name),
        department=user.department,
        total_credits=total,
        level=level,
        level_name=level_name,
        stats=_stats(db, user, len(completed)),
        projects=projects.views(db, list(completed)),
    )
