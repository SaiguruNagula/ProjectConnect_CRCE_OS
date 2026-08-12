"""Teams, membership, invitations and join requests (BACKEND_ARCHITECTURE.md §12).

`openSpots` and `Team.status` are absent by design: capacity is
`problem.team_size - active members` and status is derived from the team's
project (ADR-11). A stored copy of either would drift the moment a member left.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.common.enums import (
    INVITATION_STATUS_ENUM,
    JOIN_REQUEST_STATUS_ENUM,
    InvitationStatus,
    JoinRequestStatus,
)
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class Team(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "teams"
    __table_args__ = (Index("ix_teams_problem_id", "problem_id"),)

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(String(120))
    pitch: Mapped[str] = mapped_column(Text)
    leader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    looking_for: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TeamMember(UUIDPrimaryKey, Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "student_id", name="uq_team_members_team_id_student_id"),
        # ADR-4: one team per student per problem. problem_id is denormalised from
        # the team purely so the database — not a service check — can enforce it.
        UniqueConstraint(
            "student_id", "problem_id", name="uq_team_members_student_id_problem_id"
        ),
        Index("ix_team_members_student_id", "student_id"),
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(80))
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TeamInvitation(UUIDPrimaryKey, Base):
    """Invitations address an email: the invitee need not have an account yet."""

    __tablename__ = "team_invitations"
    __table_args__ = (
        Index(
            "uq_team_invitations_pending",
            "team_id",
            "email",
            unique=True,
            postgresql_where="status = 'pending'",
        ),
        Index("ix_team_invitations_email_status", "email", "status"),
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    email: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(80))
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    status: Mapped[InvitationStatus] = mapped_column(
        INVITATION_STATUS_ENUM, default=InvitationStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @validates("email")
    def _normalize_email(self, _key: str, value: str) -> str:
        return value.strip().lower()


class TeamJoinRequest(UUIDPrimaryKey, Base):
    __tablename__ = "team_join_requests"
    __table_args__ = (
        Index(
            "uq_team_join_requests_pending",
            "team_id",
            "student_id",
            unique=True,
            postgresql_where="status = 'pending'",
        ),
        Index("ix_team_join_requests_team_id_status", "team_id", "status"),
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[JoinRequestStatus] = mapped_column(
        JOIN_REQUEST_STATUS_ENUM, default=JoinRequestStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
