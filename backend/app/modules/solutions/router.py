"""Solutions Hub routes.

Two reads, both scoped to the caller's institution by their token. There is no
write verb here on purpose: a project reaches the hub through
`POST /projects/{id}/publication`, which is the mentor's decision, and leaves
it the same way. A second publish endpoint would be a second lifecycle.

Filtering and search are client-side in the frozen frontend — the page holds
the whole catalog and filters it in a `useMemo` — so neither endpoint takes a
parameter of any kind.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.solutions import service

router = APIRouter(prefix="/solutions", tags=["solutions"])


@router.get("")
def list_solutions(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.catalog(db, current_user), "Solutions loaded.")


@router.get("/stats")
def solution_stats(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.stats(db, current_user), "Solution stats loaded.")
