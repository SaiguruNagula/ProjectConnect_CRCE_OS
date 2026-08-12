"""Institution — the tenant boundary of the whole platform (ADR-2).

Column set follows BACKEND_ARCHITECTURE.md §12 and the frontend's
`AdminInstitution` / `InstitutionInput` shapes.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import INSTITUTION_STATUS_ENUM, InstitutionStatus
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class Institution(UUIDPrimaryKey, Timestamped, Base):
    __tablename__ = "institutions"

    name: Mapped[str] = mapped_column(String(120))
    full_name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    type: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(120))
    website: Mapped[str | None] = mapped_column(String(255))
    support_email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[InstitutionStatus] = mapped_column(
        INSTITUTION_STATUS_ENUM, default=InstitutionStatus.PENDING
    )
    tier: Mapped[str | None] = mapped_column(String(60))
    principal_name: Mapped[str | None] = mapped_column(String(160))
    principal_email: Mapped[str | None] = mapped_column(String(255))
    principal_verified: Mapped[bool] = mapped_column(default=False)

    @property
    def is_active(self) -> bool:
        return self.status is InstitutionStatus.ACTIVE
