"""Credit awards, the ledger and the rule table (BACKEND_ARCHITECTURE.md §23).

`credit_transactions` is the single ledger: every credit total anywhere in the
system is `SUM(credit_transactions.points)` for a user. Nothing caches a
balance, and no module keeps a second one (ADR-5).

Rows here are append-only. An award is never edited — a revision writes a new
`credit_awards` row, supersedes the old one and posts the difference to the
ledger, so history stays readable and the ledger stays immutable.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import ROLE_ENUM, UserRole
from app.db.base import Base, UUIDPrimaryKey

COMPONENTS = ("innovation", "implementation", "documentation", "presentation", "bonus")


class CreditAward(UUIDPrimaryKey, Base):
    """One mentor's five-component score for one project, versioned.

    `total` is a stored generated column: the client sends components, the
    database owns the sum, so the service and the row can never disagree.
    """

    __tablename__ = "credit_awards"
    __table_args__ = (
        *(
            CheckConstraint(f"{column} >= 0", name=f"{column}_non_negative")
            for column in COMPONENTS
        ),
        # One live award per project. Superseded revisions stay for history.
        Index(
            "uq_credit_awards_active_project",
            "project_id",
            unique=True,
            postgresql_where="superseded_at IS NULL",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    previous_award_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("credit_awards.id", ondelete="SET NULL")
    )
    innovation: Mapped[int] = mapped_column(Integer)
    implementation: Mapped[int] = mapped_column(Integer)
    documentation: Mapped[int] = mapped_column(Integer)
    presentation: Mapped[int] = mapped_column(Integer)
    bonus: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(
        Integer,
        Computed(
            "innovation + implementation + documentation + presentation + bonus",
            persisted=True,
        ),
    )
    awarded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CreditTransaction(UUIDPrimaryKey, Base):
    """One credited event for one user. Never updated, never deleted.

    `source_id` is the row that caused it — the `credit_awards` id for a project
    award. With `UNIQUE(user_id, source, source_id)` the same award can never
    credit the same person twice, whatever a retry does.
    """

    __tablename__ = "credit_transactions"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "source", "source_id", name="uq_credit_transactions_event"
        ),
        # The ledger page: one user, newest first. Plain ascending because a
        # btree scans backwards just as cheaply, and an expression index would
        # make `alembic check` report drift on every run.
        Index("ix_credit_transactions_user_id_created_at", "user_id", "created_at"),
        Index("ix_credit_transactions_institution_id", "institution_id"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    source: Mapped[str] = mapped_column(String(60))
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    # Signed: a correction is a negative row, never an edit of the original.
    points: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(200))
    context: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CreditRule(UUIDPrimaryKey, Base):
    """Seeded engine config: what an event is worth, per role (ADR-5).

    One engine for students and faculty. Rules are rows so the pilot can retune
    them without a deploy; they are read-only over the API.

    Two ways to price an event, exactly one per rule: `points` is a flat amount,
    `percent_of_award` a whole-number share of the award that triggered it. The
    mentor's share of a project award is the only percentage rule in V1.
    """

    __tablename__ = "credit_rules"
    __table_args__ = (
        Index("ix_credit_rules_role_active", "role", "active"),
        CheckConstraint(
            "(points IS NULL) <> (percent_of_award IS NULL)", name="price_exclusive"
        ),
        CheckConstraint(
            "percent_of_award IS NULL OR percent_of_award BETWEEN 0 AND 100",
            name="percent_is_a_percentage",
        ),
    )

    role: Mapped[UserRole] = mapped_column(ROLE_ENUM)
    event_type: Mapped[str] = mapped_column(String(60))
    points: Mapped[int | None] = mapped_column(Integer)
    percent_of_award: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(200))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
