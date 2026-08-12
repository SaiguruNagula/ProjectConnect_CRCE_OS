"""Password hashing and JWT issuing/verification.

The only place in the codebase that touches bcrypt or the JWT secret. Every
failure path raises `AuthenticationError` with a deliberately vague message —
callers must not be able to distinguish "expired" from "forged" from any
response body, only from the server-side log.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.common.enums import UserRole
from app.common.errors import AuthenticationError
from app.core.config import get_settings

# bcrypt hashes at most 72 bytes and rejects anything longer outright, so the
# limit is enforced at the trust boundary instead of silently truncating.
MAX_PASSWORD_BYTES = 72

TokenType = Literal["access", "refresh"]


def hash_password(plain: str) -> str:
    encoded = plain.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes.")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, password_hash: str) -> bool:
    encoded = plain.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
    except ValueError:
        # Corrupt or non-bcrypt hash in the row: fail closed, never authenticate.
        return False


@dataclass(frozen=True, slots=True)
class TokenClaims:
    """The verified, trusted identity of a request.

    `institution_id` here is authoritative: it comes from a signature-checked
    token, never from the request body or query string.
    """

    user_id: uuid.UUID
    role: UserRole
    institution_id: uuid.UUID
    token_type: TokenType
    jti: str
    expires_at: datetime


def _issue(
    *,
    user_id: uuid.UUID,
    role: UserRole,
    institution_id: uuid.UUID,
    token_type: TokenType,
    lifetime: timedelta,
) -> tuple[str, str, datetime]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + lifetime
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "institution_id": str(institution_id),
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def create_access_token(
    *, user_id: uuid.UUID, role: UserRole, institution_id: uuid.UUID
) -> tuple[str, datetime]:
    settings = get_settings()
    token, _, expires_at = _issue(
        user_id=user_id,
        role=role,
        institution_id=institution_id,
        token_type="access",
        lifetime=timedelta(minutes=settings.access_token_minutes),
    )
    return token, expires_at


def create_refresh_token(
    *, user_id: uuid.UUID, role: UserRole, institution_id: uuid.UUID
) -> tuple[str, str, datetime]:
    """Returns (token, jti, expires_at); the jti is persisted so it can be revoked."""
    settings = get_settings()
    return _issue(
        user_id=user_id,
        role=role,
        institution_id=institution_id,
        token_type="refresh",
        lifetime=timedelta(days=settings.refresh_token_days),
    )


def decode_token(token: str, *, expected_type: TokenType) -> TokenClaims:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub", "jti"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Invalid or expired token.") from exc

    # A refresh token must never be accepted where an access token is required,
    # or the 15-minute access window becomes a 14-day one.
    if payload.get("type") != expected_type:
        raise AuthenticationError("Invalid or expired token.")

    try:
        claims = TokenClaims(
            user_id=uuid.UUID(payload["sub"]),
            role=UserRole(payload["role"]),
            institution_id=uuid.UUID(payload["institution_id"]),
            token_type=expected_type,
            jti=payload["jti"],
            expires_at=datetime.fromtimestamp(payload["exp"], UTC),
        )
    except (KeyError, TypeError, ValueError) as exc:
        # Signed but malformed — an unknown role or a non-UUID subject means the
        # claim set cannot be trusted. Deny rather than guess.
        raise AuthenticationError("Invalid or expired token.") from exc

    return claims
