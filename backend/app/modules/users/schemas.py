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


class UserCreate(BaseModel):
    """Internal/admin creation payload — no self-service signup in the pilot."""

    name: str = Field(min_length=1, max_length=160)
    email: EmailStr = Field(max_length=255)
    # Upper bound is bcrypt's hard limit, enforced here at the trust boundary.
    password: str = Field(min_length=8, max_length=MAX_PASSWORD_BYTES)
    role: UserRole
