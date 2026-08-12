"""Auth endpoints (docs/API_SPEC.md).

The refresh token travels in the response body, matching the spec and the
frontend's token-based API client. Nothing here reads an institution id from the
request — the token decides.
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.auth import service
from app.modules.auth.schemas import LoginRequest, RefreshRequest
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: DbSession) -> dict[str, object]:
    pair = service.login(db, email=payload.email, password=payload.password)
    return ok(pair, "Signed in.")


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: DbSession) -> dict[str, object]:
    pair = service.refresh(db, refresh_token=payload.refresh_token)
    return ok(pair, "Token refreshed.")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: DbSession) -> Response:
    service.logout(db, refresh_token=payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me")
def me(current_user: CurrentUser) -> dict[str, object]:
    return ok(UserOut.model_validate(current_user), "Current user.")
