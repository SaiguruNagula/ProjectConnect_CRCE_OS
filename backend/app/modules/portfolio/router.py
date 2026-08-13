"""Portfolio routes (BACKEND_ARCHITECTURE.md §22).

One read, and it takes no parameters. §22 also specifies `GET /portfolio/{userId}`
for visitors, but that view is gated on profile visibility flags
(`publicProfile`, `showContact`, `showSocials`) and on a published customization
— none of which exist in the schema yet. Serving someone else's portfolio before
those flags exist would publish contact details nobody consented to, so the
route waits for the phase that adds them.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.portfolio import service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/me")
def my_portfolio(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.me(db, current_user), "Portfolio loaded.")
