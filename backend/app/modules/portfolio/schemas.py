"""Portfolio response schemas (BACKEND_ARCHITECTURE.md §22).

Every field here is *derived*. Nothing in this module is stored, edited or
supplied by a client, so there is no `PortfolioIn`.

domain.ts `Portfolio` also carries research, hackathons, certificates and
external achievements. None of those has a canonical backend source — §22 marks
them "mock-only with no entry UI … do not build CRUD for them" — so they are
absent from this contract rather than present and permanently empty.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.common.enums import UserRole
from app.modules.projects.schemas import ProjectOut


class PortfolioStatsOut(BaseModel):
    """Counts of verified activity, each a count of canonical rows.

    The faculty pair is `None` for a student: a student cannot publish a problem
    or review a stage, and 0 would read as "did none of it" rather than
    "does not apply".
    """

    projects_completed: int
    verified_solutions: int
    problems_published: int | None = None
    reviews_completed: int | None = None


class PortfolioOut(BaseModel):
    """domain.ts `Portfolio`, restricted to what the backend can actually verify."""

    user_id: uuid.UUID
    name: str
    role: UserRole
    email: str
    avatar_initials: str
    # Read from `users.department`, the one place a person's department is
    # stored. Still null for anyone who has not filled in their profile.
    department: str | None = None

    total_credits: int
    level: int
    level_name: str

    stats: PortfolioStatsOut
    # References to the project read model, not a second copy of it.
    projects: list[ProjectOut]
