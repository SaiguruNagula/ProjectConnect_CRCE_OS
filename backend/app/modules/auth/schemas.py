"""Auth payloads — shapes fixed by docs/API_SPEC.md."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.modules.users.schemas import UserOut


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    # Generous upper bound: rejecting a long *login* attempt by length would leak
    # nothing useful, but it also must never reach bcrypt unbounded.
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
