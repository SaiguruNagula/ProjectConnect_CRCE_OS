"""Problems, drafts, bookmarks and suggestions (BACKEND_ARCHITECTURE.md §12).

Counts the catalog displays (`applicantsCount`, `currentTeamCount`) are not
columns: they are aggregates over applications and teams, computed in SQL by the
repository so a stale counter can never disagree with the rows it counts.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import (
    PROBLEM_STATUS_ENUM,
    PROBLEM_SUGGESTION_STATUS_ENUM,
    ProblemStatus,
    ProblemSuggestionStatus,
)
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class Problem(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "problems"
    __table_args__ = (
        CheckConstraint("team_size BETWEEN 1 AND 6", name="team_size_range"),
        CheckConstraint("base_credits >= 0", name="base_credits_non_negative"),
        CheckConstraint("end_date >= start_date", name="dates_ordered"),
        Index(
            "ix_problems_institution_id_status_department",
            "institution_id",
            "status",
            "department",
        ),
        Index("ix_problems_created_by_status", "created_by", "status"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    statement: Mapped[str] = mapped_column(Text)
    current_challenge: Mapped[str | None] = mapped_column(Text)
    expected_impact: Mapped[str | None] = mapped_column(Text)
    department: Mapped[str] = mapped_column(String(120))
    difficulty: Mapped[str] = mapped_column(String(20))
    required_skills: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list)
    tools: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list)
    team_size: Mapped[int] = mapped_column()
    allow_individual: Mapped[bool] = mapped_column(default=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    base_credits: Mapped[int] = mapped_column()
    status: Mapped[ProblemStatus] = mapped_column(
        PROBLEM_STATUS_ENUM, default=ProblemStatus.OPEN
    )
    # Set when a mentor approves a student suggestion. use_alter breaks the
    # problems ⇄ problem_suggestions cycle at DDL time.
    suggestion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "problem_suggestions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_problems_suggestion_id_problem_suggestions",
        ),
    )
    # Display-only chips ({name, type, url}); evidence is URL-based, never uploaded.
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProblemDraft(UUIDPrimaryKey, Timestamped, Base):
    """An author's unpublished authoring state — never visible in the catalog."""

    __tablename__ = "problem_drafts"
    __table_args__ = (Index("ix_problem_drafts_created_by", "created_by"),)

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class ProblemBookmark(Base):
    __tablename__ = "problem_bookmarks"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ProblemSuggestion(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "problem_suggestions"
    __table_args__ = (
        Index("ix_problem_suggestions_mentor_id_status", "mentor_id", "status"),
        Index("ix_problem_suggestions_student_id", "student_id"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    mentor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    status: Mapped[ProblemSuggestionStatus] = mapped_column(
        PROBLEM_SUGGESTION_STATUS_ENUM, default=ProblemSuggestionStatus.DRAFT
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(120))
    importance: Mapped[str] = mapped_column(Text)
    expected_impact: Mapped[str] = mapped_column(Text)
    reference_links: Mapped[list[str]] = mapped_column(ARRAY(String(500)), default=list)
    mentor_feedback: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_problem_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="SET NULL")
    )
