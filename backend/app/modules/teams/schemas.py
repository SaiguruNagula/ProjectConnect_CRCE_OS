"""Team read models and payloads — domain.ts `Team`, `JoinRequest`, `Invitation`.

`status`, `openSpots`, `canManage`, `mine` and `joinRequested` are composed per
caller on read (ADR-11). None of them is a column, and none is accepted from a
request body.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

TeamStatus = Literal["recruiting", "applied", "selected", "completed"]

LEAD_ROLE = "Team Lead"
MEMBER_ROLE = "Member"


def initials(name: str) -> str:
    """utils/initials.ts, server-side: first letters of the first two words."""
    cleaned = name.removeprefix("Dr. ").removeprefix("Dr ").strip()
    return "".join(part[0].upper() for part in cleaned.split()[:2] if part)


class TeamMemberOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str
    avatar_initials: str

    @classmethod
    def of(cls, member_id: uuid.UUID, name: str, role: str) -> TeamMemberOut:
        return cls(id=member_id, name=name, role=role, avatar_initials=initials(name))


class TeamInviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    invited_at: datetime


class TeamOut(BaseModel):
    id: uuid.UUID
    name: str
    problem_id: uuid.UUID
    pitch: str
    members: list[TeamMemberOut]
    leader_id: uuid.UUID
    created_at: datetime
    status: TeamStatus
    open_spots: int
    looking_for: list[str]
    pending_invites: list[TeamInviteOut]
    can_manage: bool
    mine: bool
    join_requested: bool


class CreateTeamInput(BaseModel):
    problem_id: uuid.UUID
    name: str = Field(min_length=3, max_length=120)
    pitch: str = Field(min_length=10)
    looking_for: list[str] = Field(default_factory=list)


class InviteMemberInput(BaseModel):
    email: EmailStr
    # The mock defaults a blank role rather than rejecting it.
    role: str = Field(default=MEMBER_ROLE, max_length=80)


class JoinRequestInput(BaseModel):
    message: str = Field(min_length=20)


class JoinRequestOut(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    team_name: str
    student_id: uuid.UUID
    student_name: str
    avatar_initials: str
    message: str
    requested_at: datetime


class InvitationOut(BaseModel):
    """domain.ts `Invitation` — what the invitee sees, not what the lead sent."""

    id: uuid.UUID
    project_title: str
    invited_by: str
    role: str
    team_id: uuid.UUID
    problem_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
