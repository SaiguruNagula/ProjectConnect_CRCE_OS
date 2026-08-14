"""The leaderboard read model (BACKEND_ARCHITECTURE.md §24, ADR-5).

There is no leaderboard scoring. The Credit Engine owns every number on this
page: the score is the ledger sum, the badge is the Phase 5A tier for that sum,
and this module only orders and labels what it is given.

One board, parameterised by role — students and faculty are ranked by the same
query against the same ledger, because CRCE OS has one contribution economy.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.modules.credits import config
from app.modules.leaderboard import repository as repo
from app.modules.leaderboard.schemas import LeaderboardEntryOut
from app.modules.teams.schemas import initials
from app.modules.users.models import User


def board(db: Session, viewer: User, role: UserRole) -> list[LeaderboardEntryOut]:
    """The viewer's own institution, ranked. No other institution is reachable."""
    return [
        LeaderboardEntryOut(
            id=user_id,
            rank=rank,
            name=name,
            # The department its owner set on their profile. A filter label on
            # the board, never an input to the credits or the rank above it.
            department=department,
            role=user_role,
            credits=int(credits),
            contributions=int(contributions),
            # The same ladder `GET /credits/summary` reports a level from.
            badge=config.level_of(int(credits))[1],
            avatar_initials=initials(name),
        )
        for user_id, name, user_role, department, credits, rank, contributions in repo.board(
            db, institution_id=viewer.institution_id, role=role
        )
    ]
