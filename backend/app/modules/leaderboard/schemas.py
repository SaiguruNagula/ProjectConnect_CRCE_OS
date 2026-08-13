"""Leaderboard response schema.

One shape for both boards — the role field is what differs, and the frontend
renders the same table from either. Read-only: there is no leaderboard input.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.common.enums import UserRole


class LeaderboardEntryOut(BaseModel):
    """domain.ts `LeaderboardEntry` — one ranked member of the institution."""

    id: uuid.UUID
    rank: int
    name: str
    # Blocked: `users` has no department column, so there is nothing truthful to
    # put here. Not derived from problems/projects — that would invent an
    # affiliation the platform never recorded. See the Phase 5B report.
    department: str | None = None
    role: UserRole
    credits: int
    # Display only: shipped projects (student) / projects mentored (faculty).
    # Never an input to `credits` or `rank`.
    contributions: int
    # The Phase 5A tier for this credit total. Display only.
    badge: str
    avatar_initials: str
    # V1 keeps no rank history, so there is no movement to report.
    rank_change: int = 0
