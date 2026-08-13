"""Credit ledger routes (BACKEND_ARCHITECTURE.md §23).

Six reads, all of the caller's own credits. No endpoint takes a user id: a
ledger is personal, and other people's totals surface as aggregates elsewhere.

Role-agnostic on purpose — students and faculty earn from the same engine
(ADR-5), so neither gets a private copy of these routes. Awarding lives on the
project surface the frontend posts to; there is no write route here.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession
from app.modules.credits import service

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/summary")
def credit_summary(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.summary(db, current_user), "Credit summary loaded.")


@router.get("/history")
def credit_history(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.history(db, current_user), "Credit history loaded.")


@router.get("/me")
def credit_breakdown(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.breakdown(db, current_user), "Credit breakdown loaded.")


@router.get("/rules")
def credit_rules(db: DbSession, current_user: CurrentUser) -> dict[str, object]:
    return ok(service.rules(db), "Credit rules loaded.")


@router.get("/categories")
def credit_categories(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.categories(db, current_user), "Credit categories loaded.")


@router.get("/pipeline")
def credit_pipeline(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.pipeline(db, current_user), "Credit pipeline loaded.")
