"""User directory reads — institution-scoped, role-gated.

ADMIN only, per the authorization matrix (BACKEND_ARCHITECTURE.md §7: "Admin
users / institutions / dashboard" is admin-exclusive) and §15: "user ids in
paths are only accepted for public reads (portfolio) and admin". A user reads
their own record through `GET /auth/me`, which needs no id in the path.

Neither endpoint accepts an institution id: the scope comes from the token.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import UserRole
from app.common.envelope import ok
from app.common.errors import NotFoundError
from app.common.pagination import PageParams, page_params, paginate
from app.core.deps import DbSession, require_role
from app.modules.users import repository
from app.modules.users.models import User
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/users", tags=["users"])

DirectoryReader = Annotated[User, Depends(require_role(UserRole.ADMIN))]
Pagination = Annotated[PageParams, Depends(page_params)]


@router.get("")
def list_users(
    current_user: DirectoryReader, db: DbSession, params: Pagination
) -> dict[str, object]:
    rows, total = repository.list_by_institution(
        db, current_user.institution_id, limit=params.limit, offset=params.offset
    )
    page = paginate([UserOut.model_validate(row) for row in rows], total, params)
    return ok(page, "Users loaded.")


@router.get("/{user_id}")
def get_user(
    user_id: uuid.UUID, current_user: DirectoryReader, db: DbSession
) -> dict[str, object]:
    user = repository.get_by_id(db, user_id, institution_id=current_user.institution_id)
    if user is None:
        # Covers both "no such user" and "user of another institution".
        raise NotFoundError("User not found.")
    return ok(UserOut.model_validate(user), "User loaded.")
