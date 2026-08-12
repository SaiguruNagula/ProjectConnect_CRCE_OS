"""Problem catalog, drafts, bookmarks and problem suggestions.

Only the twelve endpoints the frontend calls (BACKEND_ARCHITECTURE.md §11).
There is no update or delete for a published problem: nothing in the product
edits or removes one, so nothing here exposes it.

Every route names its roles. The institution is taken from the caller, never
from the path, the query string or the body.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.enums import UserRole
from app.common.envelope import ok
from app.common.pagination import DEFAULT_LIMIT, MAX_LIMIT
from app.core.deps import CurrentUser, DbSession, require_role
from app.modules.problems import service
from app.modules.problems.schemas import (
    ProblemCreate,
    ProblemSort,
    ProblemSuggestionInput,
    SuggestionDecisionInput,
)
from app.modules.users.models import User

router = APIRouter(tags=["problems"])

Faculty = Annotated[User, Depends(require_role(UserRole.FACULTY))]
Student = Annotated[User, Depends(require_role(UserRole.STUDENT))]


@router.get("/problems")
def list_problems(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    search: str | None = Query(None, max_length=200),
    department: str | None = Query(None, max_length=120),
    saved_only: bool = Query(False),
    sort: Annotated[ProblemSort | None, Query()] = None,
) -> dict[str, object]:
    catalog = service.catalog(
        db,
        current_user,
        page=page,
        limit=limit,
        search=search,
        department=department,
        saved_only=saved_only,
        sort=sort,
    )
    return ok(catalog, "Problems loaded.")


# Static segment before `/problems/{problem_id}`, or "drafts" parses as an id.
@router.get("/problems/drafts")
def list_drafts(current_user: Faculty, db: DbSession) -> dict[str, object]:
    return ok(service.list_drafts(db, current_user), "Drafts loaded.")


@router.post("/problems/drafts", status_code=201)
def save_draft(
    payload: ProblemCreate, current_user: Faculty, db: DbSession
) -> dict[str, object]:
    return ok(service.save_draft(db, current_user, payload), "Draft saved.")


@router.get("/problems/{problem_id}")
def get_problem(
    problem_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> dict[str, object]:
    return ok(service.detail(db, current_user, problem_id), "Problem loaded.")


@router.post("/problems", status_code=201)
def create_problem(
    payload: ProblemCreate, current_user: Faculty, db: DbSession
) -> dict[str, object]:
    return ok(service.create(db, current_user, payload), "Problem published.")


@router.put("/problems/{problem_id}/bookmark")
def add_bookmark(
    problem_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    problem = service.set_bookmark(db, current_user, problem_id, bookmarked=True)
    return ok(problem, "Saved to your list.")


@router.delete("/problems/{problem_id}/bookmark")
def remove_bookmark(
    problem_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    problem = service.set_bookmark(db, current_user, problem_id, bookmarked=False)
    return ok(problem, "Removed from your list.")


@router.get("/mentors")
def list_mentors(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    return ok(service.mentors(db, current_user), "Mentors loaded.")


@router.get("/problem-suggestions")
def list_suggestions(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    """Students get their own suggestions; faculty get the ones sent to them."""
    return ok(service.list_suggestions(db, current_user), "Suggestions loaded.")


@router.post("/problem-suggestions", status_code=201)
def create_suggestion(
    payload: ProblemSuggestionInput,
    current_user: Student,
    db: DbSession,
    submit: bool = Query(False),
) -> dict[str, object]:
    suggestion = service.save_suggestion(db, current_user, payload, submit=submit)
    return ok(suggestion, "Suggestion sent to your mentor." if submit else "Draft saved.")


@router.put("/problem-suggestions/{suggestion_id}")
def update_suggestion(
    suggestion_id: uuid.UUID,
    payload: ProblemSuggestionInput,
    current_user: Student,
    db: DbSession,
    submit: bool = Query(False),
) -> dict[str, object]:
    suggestion = service.save_suggestion(
        db, current_user, payload, submit=submit, suggestion_id=suggestion_id
    )
    return ok(suggestion, "Suggestion sent to your mentor." if submit else "Draft saved.")


@router.post("/problem-suggestions/{suggestion_id}/decision")
def decide_suggestion(
    suggestion_id: uuid.UUID,
    payload: SuggestionDecisionInput,
    current_user: Faculty,
    db: DbSession,
) -> dict[str, object]:
    suggestion = service.decide_suggestion(db, current_user, suggestion_id, payload)
    return ok(suggestion, "Decision recorded.")
