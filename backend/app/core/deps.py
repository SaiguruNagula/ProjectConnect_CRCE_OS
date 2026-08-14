"""Request-scoped identity and role dependencies.

Routers never parse a token, read a role string or accept an institution id from
the client. They declare `CurrentUser` or `Depends(require_role(...))` and this
module resolves the caller from the signed access token alone.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.common.errors import AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.session import get_db
from app.modules.users.models import User

DbSession = Annotated[Session, Depends(get_db)]

# `auto_error=False` so a missing or malformed header falls through to this
# module's own 401 envelope instead of Starlette's bare HTTPException. The
# scheme exists so the generated OpenAPI document says which endpoints need a
# token — every route resolving `CurrentUser` carries it.
_bearer = HTTPBearer(auto_error=False, description="Access token issued by /auth/login.")

BearerToken = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def get_current_user(credentials: BearerToken, db: DbSession) -> User:
    """The single source of authenticated identity for the whole API."""
    if credentials is None or not credentials.credentials.strip():
        raise AuthenticationError("Authentication required.")

    claims = decode_token(credentials.credentials.strip(), expected_type="access")

    user = db.get(User, claims.user_id)
    if user is None or not user.is_active:
        # Deleted, suspended or pending since the token was issued.
        raise AuthenticationError("Invalid or expired token.")

    # The token is signed, but the database is authoritative: a role or
    # institution changed after issue must take effect immediately, and a token
    # whose claims no longer match the row is not trustworthy.
    if user.role is not claims.role or user.institution_id != claims.institution_id:
        raise AuthenticationError("Invalid or expired token.")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[[User], User]:
    """Route-level role gate. Roles are enum members, never raw strings."""
    allowed = frozenset(roles)

    def dependency(current_user: CurrentUser) -> User:
        if current_user.role not in allowed:
            raise AuthorizationError("You do not have permission to perform this action.")
        return current_user

    return dependency


def current_institution_id(current_user: CurrentUser) -> uuid.UUID:
    """The effective tenant of the request — always derived, never supplied."""
    return current_user.institution_id


InstitutionId = Annotated[uuid.UUID, Depends(current_institution_id)]
