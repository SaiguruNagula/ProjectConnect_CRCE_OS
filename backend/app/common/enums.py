"""Enumerations shared across modules, backed by native PostgreSQL enum types.

Values match the frozen frontend contract exactly (types/index.ts `Role`,
domain.ts `InstitutionStatus` and `DirectoryUser.status`).
"""

from __future__ import annotations

from enum import Enum, StrEnum

import sqlalchemy as sa


class UserRole(StrEnum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"
    PRINCIPAL = "principal"


class UserStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"


class InstitutionStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"


def pg_enum(enum_class: type[Enum], name: str) -> sa.Enum:
    """Persist the enum *values* ('student'), not the member names ('STUDENT')."""
    return sa.Enum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )


ROLE_ENUM = pg_enum(UserRole, "role_enum")
USER_STATUS_ENUM = pg_enum(UserStatus, "user_status")
INSTITUTION_STATUS_ENUM = pg_enum(InstitutionStatus, "inst_status")
