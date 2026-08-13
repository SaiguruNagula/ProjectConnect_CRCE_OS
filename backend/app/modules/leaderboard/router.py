"""Leaderboard routes (BACKEND_ARCHITECTURE.md §24).

Two reads, both scoped to the caller's institution by their token. There is no
institution parameter, no pagination and no write verb: the board is a view of
the ledger, so the only way to move up it is to earn credits.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.common.enums import UserRole
from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.leaderboard import service

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/students")
def student_leaderboard(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    board = service.board(db, current_user, UserRole.STUDENT)
    return ok(board, "Leaderboard loaded.")


@router.get("/faculty")
def faculty_leaderboard(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    board = service.board(db, current_user, UserRole.FACULTY)
    return ok(board, "Leaderboard loaded.")
