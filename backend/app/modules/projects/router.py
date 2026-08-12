"""Applications and the project space (BACKEND_ARCHITECTURE.md §11).

Applying lives under `/problems/{id}/applications` because that is where the
frontend calls it from; it belongs to this module because it creates the
project. Stage saves are students-only — faculty read a workspace, and Phase 4
gives them the review verbs.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.enums import SubmissionStage, UserRole
from app.common.envelope import ok
from app.core.deps import CurrentUser, DbSession, require_role
from app.modules.projects import service
from app.modules.projects.schemas import (
    ApplicationInput,
    FinalSubmissionIn,
    IdeaSubmissionIn,
    PocSubmissionIn,
)
from app.modules.users.models import User

router = APIRouter(tags=["projects"])

Student = Annotated[User, Depends(require_role(UserRole.STUDENT))]
Submit = Annotated[bool, Query()]


@router.post("/problems/{problem_id}/applications", status_code=201)
def apply_to_problem(
    problem_id: uuid.UUID,
    payload: ApplicationInput,
    current_user: Student,
    db: DbSession,
) -> dict[str, object]:
    project = service.apply_to_problem(db, current_user, problem_id, payload)
    return ok(project, "Application submitted.")


@router.delete("/problems/{problem_id}/applications/me")
def withdraw_application(
    problem_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    service.withdraw_application(db, current_user, problem_id)
    return ok(None, "Application withdrawn.")


@router.get("/projects")
def list_projects(current_user: CurrentUser, db: DbSession) -> dict[str, object]:
    """A student's own projects; a faculty member's mentored ones."""
    return ok(service.list_projects(db, current_user), "Projects loaded.")


@router.get("/projects/{project_id}")
def get_project(
    project_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> dict[str, object]:
    return ok(service.get_project(db, current_user, project_id), "Project loaded.")


@router.get("/projects/{project_id}/journey")
def get_journey(
    project_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> dict[str, object]:
    return ok(service.journey(db, current_user, project_id), "Journey loaded.")


@router.put("/projects/{project_id}/idea")
def save_idea(
    project_id: uuid.UUID,
    payload: IdeaSubmissionIn,
    current_user: Student,
    db: DbSession,
    submit: Submit = False,
) -> dict[str, object]:
    journey = service.save_stage(
        db,
        current_user,
        project_id,
        SubmissionStage.IDEA,
        payload.model_dump(mode="json"),
        submit=submit,
    )
    return ok(journey, "Idea submitted." if submit else "Draft saved.")


@router.put("/projects/{project_id}/proof-of-concept")
def save_poc(
    project_id: uuid.UUID,
    payload: PocSubmissionIn,
    current_user: Student,
    db: DbSession,
    submit: Submit = False,
) -> dict[str, object]:
    journey = service.save_stage(
        db,
        current_user,
        project_id,
        SubmissionStage.POC,
        payload.model_dump(mode="json"),
        submit=submit,
    )
    return ok(journey, "Proof of concept submitted." if submit else "Draft saved.")


@router.put("/projects/{project_id}/final")
def save_final(
    project_id: uuid.UUID,
    payload: FinalSubmissionIn,
    current_user: Student,
    db: DbSession,
    submit: Submit = False,
) -> dict[str, object]:
    journey = service.save_stage(
        db,
        current_user,
        project_id,
        SubmissionStage.FINAL,
        payload.model_dump(mode="json"),
        submit=submit,
    )
    return ok(journey, "Final project submitted." if submit else "Draft saved.")
