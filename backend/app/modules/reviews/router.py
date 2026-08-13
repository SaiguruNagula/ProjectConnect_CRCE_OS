"""Review engine routes (BACKEND_ARCHITECTURE.md §21).

Three endpoints, one per thing the FacultyReviewView does: list the queues,
open a project, decide a stage. Students reach their own review through the
existing project APIs and have nothing to call here.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.enums import SubmissionStage, UserRole
from app.common.envelope import ok
from app.core.deps import DbSession, require_role
from app.modules.reviews import service
from app.modules.reviews.schemas import ReviewDecisionIn
from app.modules.users.models import User

router = APIRouter(prefix="/reviews", tags=["reviews"])

Faculty = Annotated[User, Depends(require_role(UserRole.FACULTY))]


@router.get("/queues")
def review_queues(current_user: Faculty, db: DbSession) -> dict[str, object]:
    return ok(service.queues(db, current_user), "Review queues loaded.")


@router.get("/{project_id}")
def review_detail(
    project_id: uuid.UUID, current_user: Faculty, db: DbSession
) -> dict[str, object]:
    return ok(service.detail(db, current_user, project_id), "Journey loaded.")


@router.post("/{project_id}/{stage}")
def decide_stage(
    project_id: uuid.UUID,
    stage: SubmissionStage,
    payload: ReviewDecisionIn,
    current_user: Faculty,
    db: DbSession,
) -> dict[str, object]:
    journey = service.decide(db, current_user, project_id, stage, payload)
    return ok(journey, "Decision recorded.")
