"""User directory reads — institution-scoped, role-gated.

ADMIN only, per the authorization matrix (BACKEND_ARCHITECTURE.md §7: "Admin
users / institutions / dashboard" is admin-exclusive) and §15: "user ids in
paths are only accepted for public reads (portfolio) and admin". A user reads
their own record through `GET /auth/me`, which needs no id in the path.

No endpoint here accepts an institution id: the scope comes from the token.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.common.errors import NotFoundError
from app.common.pagination import PageParams, page_params
from app.core.deps import DbSession, require_role
from app.modules.users import repository, service
from app.modules.users.models import User
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/users", tags=["users"])

DirectoryReader = Annotated[User, Depends(require_role(UserRole.ADMIN))]
Pagination = Annotated[PageParams, Depends(page_params)]


@router.get("")
def list_users(
    current_user: DirectoryReader, db: DbSession, params: Pagination
) -> dict[str, object]:
    page = service.directory(db, institution_id=current_user.institution_id, params=params)
    return ok(page, "Users loaded.")


@router.get("/overview")
def users_overview(current_user: DirectoryReader, db: DbSession) -> dict[str, object]:
    """Headcount for the whole institution, not for the page above.

    Declared before `/{user_id}` so the path matches this route and not a
    malformed uuid.
    """
    return ok(service.overview(db, institution_id=current_user.institution_id), "Overview loaded.")


@router.get("/{user_id}")
def get_user(
    user_id: uuid.UUID, current_user: DirectoryReader, db: DbSession
) -> dict[str, object]:
    user = repository.get_by_id(db, user_id, institution_id=current_user.institution_id)
    if user is None:
        # Covers both "no such user" and "user of another institution".
        raise NotFoundError("User not found.")
    return ok(UserOut.model_validate(user), "User loaded.")
