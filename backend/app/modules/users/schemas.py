"""User-facing representations. `password_hash` appears in none of them."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.common.enums import UserRole, UserStatus
from app.core.security import MAX_PASSWORD_BYTES


class UserOut(BaseModel):
    """Mirrors the frozen frontend `User` type (types/index.ts) plus status."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus


class DirectoryUserOut(UserOut):
    """A directory row: the account, plus what the person has done with it.

    `credits` comes from the Credit Engine and `projects` from the projects
    module — neither number is computed here, and neither is stored on the user.
    """

    department: str | None
    institution: str
    credits: int
    projects: int


class UsersOverviewOut(BaseModel):
    """The institution's headcount, counted in the database.

    Counts only. How they are labelled and coloured is the frontend's, and a
    figure with no canonical source (growth trends, verification backlogs) is
    absent rather than estimated.
    """

    total: int
    students: int
    faculty: int
    principals: int
    pending: int
    suspended: int


class UserCreate(BaseModel):
    """Internal/admin creation payload — no self-service signup in the pilot."""

    name: str = Field(min_length=1, max_length=160)
    email: EmailStr = Field(max_length=255)
    # Upper bound is bcrypt's hard limit, enforced here at the trust boundary.
    password: str = Field(min_length=8, max_length=MAX_PASSWORD_BYTES)
    role: UserRole
