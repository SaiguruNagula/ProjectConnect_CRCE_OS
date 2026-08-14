"""User — identity, credentials and tenant membership.

`password_hash` holds a bcrypt digest and is never serialised: no schema in this
codebase exposes it, and repr() is overridden so it cannot leak into a log line
or an exception message.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.common.enums import ROLE_ENUM, USER_STATUS_ENUM, UserRole, UserStatus
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class User(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "users"
    __table_args__ = (
        # Login carries no institution, so the address must resolve to exactly one
        # account platform-wide. This is strictly stronger than the architecture's
        # UNIQUE(institution_id, email) and satisfies it.
        Index("uq_users_email", "email", unique=True),
        Index("ix_users_institution_id_role", "institution_id", "role"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT")
    )
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[UserRole] = mapped_column(ROLE_ENUM)
    status: Mapped[UserStatus] = mapped_column(USER_STATUS_ENUM, default=UserStatus.ACTIVE)

    # The canonical department of a person. Both `StudentProfile` and
    # `FacultyProfile` carry it and both let the owner edit it, so it lives on
    # the row they share rather than being written twice; the portfolio reads it
    # from here whatever the role. Nullable because every existing account
    # predates the column and nobody has been asked yet.
    department: Mapped[str | None] = mapped_column(String(120))

    # Authentication metadata (BACKEND_ARCHITECTURE.md §14 lockout/backoff).
    failed_login_attempts: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @validates("email")
    def _normalize_email(self, _key: str, value: str) -> str:
        """Stored lowercase so the unique index and login lookups always agree."""
        return value.strip().lower()

    @property
    def is_active(self) -> bool:
        return self.status is UserStatus.ACTIVE and self.deleted_at is None

    def __repr__(self) -> str:
        # Deliberately omits password_hash and email.
        return f"<User id={self.id} role={self.role.value}>"
