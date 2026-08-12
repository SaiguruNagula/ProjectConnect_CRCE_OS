"""Applications, projects and stage submissions (BACKEND_ARCHITECTURE.md §12).

Per ADR-1 an application creates its project in the same transaction; there is
no faculty acceptance step. `applications.project_id` carries that link, and is
the only way a withdrawn *solo* application can find the project it must
soft-delete — a solo project has no team to look it up by.

Review columns on `stage_submissions` are written by the Phase 4 review engine.
Phase 3 writes payload/status/saved_at/submitted_at only.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import (
    APPLICATION_STATUS_ENUM,
    SELECTION_STATUS_ENUM,
    SUBMISSION_STAGE_ENUM,
    SUBMISSION_STATUS_ENUM,
    ApplicationStatus,
    SelectionStatus,
    SubmissionStage,
    SubmissionStatus,
)
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class Application(UUIDPrimaryKey, Base):
    __tablename__ = "applications"
    __table_args__ = (
        # One *active* application per student per problem. Partial, because the
        # frontend offers Apply again after a withdrawal.
        Index(
            "uq_applications_active",
            "problem_id",
            "student_id",
            unique=True,
            postgresql_where="status = 'active'",
        ),
        Index("ix_applications_student_id", "student_id"),
        Index("ix_applications_problem_id_status", "problem_id", "status"),
    )

    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE")
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL")
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), unique=True
    )
    idea_summary: Mapped[str] = mapped_column(Text)
    approach: Mapped[str] = mapped_column(Text)
    attachment_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[ApplicationStatus] = mapped_column(
        APPLICATION_STATUS_ENUM, default=ApplicationStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Project(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "projects"
    __table_args__ = (
        # ADR-12: teams compete on a problem, but a team runs one project on it.
        Index(
            "uq_projects_active_team",
            "problem_id",
            "team_id",
            unique=True,
            postgresql_where="team_id IS NOT NULL AND deleted_at IS NULL",
        ),
        Index("ix_projects_mentor_id", "mentor_id"),
        Index("ix_projects_team_id", "team_id"),
        Index("ix_projects_institution_id_problem_id", "institution_id", "problem_id"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id", ondelete="RESTRICT")
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL")
    )
    mentor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    selection_status: Mapped[SelectionStatus] = mapped_column(
        SELECTION_STATUS_ENUM, default=SelectionStatus.NOT_REVIEWED
    )
    selection_feedback: Mapped[str | None] = mapped_column(Text)
    selection_decided_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    selection_decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published: Mapped[bool] = mapped_column(default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StageSubmission(UUIDPrimaryKey, Base):
    __tablename__ = "stage_submissions"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "stage", name="uq_stage_submissions_project_id_stage"
        ),
        Index("ix_stage_submissions_status_stage", "status", "stage"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    stage: Mapped[SubmissionStage] = mapped_column(SUBMISSION_STAGE_ENUM)
    status: Mapped[SubmissionStatus] = mapped_column(
        SUBMISSION_STATUS_ENUM, default=SubmissionStatus.DRAFT
    )
    # The stage document the UI round-trips whole. Never queried field by field,
    # and never unvalidated: each stage has its own request schema.
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    saved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- Phase 4 (review engine) owns everything below --------------------
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    review_strengths: Mapped[str | None] = mapped_column(Text)
    review_weaknesses: Mapped[str | None] = mapped_column(Text)
    review_suggestions: Mapped[str | None] = mapped_column(Text)
    review_comments: Mapped[str | None] = mapped_column(Text)
    evaluation: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
