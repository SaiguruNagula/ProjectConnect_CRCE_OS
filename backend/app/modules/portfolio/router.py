"""Portfolio routes (BACKEND_ARCHITECTURE.md §22).

`GET /portfolio/{userId}` composes the same verified facts `/me` does, for
anyone else in the caller's institution — no visibility flags gate it because
none of what it returns is more sensitive than what a problem listing (faculty
name), a team roster (member names, avatars) or the leaderboard (name,
department, credits) already shows across that same boundary.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.portfolio import service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/me")
def my_portfolio(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.me(db, current_user), "Portfolio loaded.")


@router.get("/{user_id}")
def user_portfolio(user_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.get(db, current_user, user_id), "Portfolio loaded.")
