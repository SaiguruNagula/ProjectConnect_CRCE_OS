"""Team formation endpoints (BACKEND_ARCHITECTURE.md §11).

Students only: faculty neither form nor join teams. Lead-only actions are
checked in the service against the team row, not against a path parameter.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.enums import UserRole
from app.common.envelope import ok
from app.core.deps import DbSession, require_role
from app.modules.teams import service
from app.modules.teams.schemas import CreateTeamInput, InviteMemberInput, JoinRequestInput
from app.modules.users.models import User

router = APIRouter(prefix="/teams", tags=["teams"])

Student = Annotated[User, Depends(require_role(UserRole.STUDENT))]


# Static segments first: "invitations" and "mine" must not parse as team ids.
@router.get("/invitations")
def list_invitations(current_user: Student, db: DbSession) -> dict[str, object]:
    return ok(service.list_invitations(db, current_user), "Invitations loaded.")


@router.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    remaining = service.respond_to_invitation(
        db, current_user, invitation_id, accept=True
    )
    return ok(remaining, "Invitation accepted.")


@router.post("/invitations/{invitation_id}/decline")
def decline_invitation(
    invitation_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    remaining = service.respond_to_invitation(
        db, current_user, invitation_id, accept=False
    )
    return ok(remaining, "Invitation declined.")


@router.get("/mine/join-requests")
def list_join_requests(current_user: Student, db: DbSession) -> dict[str, object]:
    """The lead's inbox — a student who leads nothing gets an empty list."""
    return ok(service.list_join_requests(db, current_user), "Join requests loaded.")


@router.post("/join-requests/{request_id}/accept")
def accept_join_request(
    request_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    remaining = service.respond_to_join_request(db, current_user, request_id, accept=True)
    return ok(remaining, "Join request accepted.")


@router.post("/join-requests/{request_id}/reject")
def reject_join_request(
    request_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    remaining = service.respond_to_join_request(
        db, current_user, request_id, accept=False
    )
    return ok(remaining, "Join request rejected.")


@router.get("")
def list_teams(
    current_user: Student,
    db: DbSession,
    problem_id: Annotated[uuid.UUID | None, Query()] = None,
) -> dict[str, object]:
    return ok(service.list_teams(db, current_user, problem_id=problem_id), "Teams loaded.")


@router.post("", status_code=201)
def create_team(
    payload: CreateTeamInput, current_user: Student, db: DbSession
) -> dict[str, object]:
    return ok(service.create_team(db, current_user, payload), "Team created.")


@router.get("/{team_id}")
def get_team(
    team_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    return ok(service.get_team(db, current_user, team_id), "Team loaded.")


@router.post("/{team_id}/invitations", status_code=201)
def invite_member(
    team_id: uuid.UUID,
    payload: InviteMemberInput,
    current_user: Student,
    db: DbSession,
) -> dict[str, object]:
    return ok(service.invite_member(db, current_user, team_id, payload), "Invitation sent.")


@router.post("/{team_id}/join-requests", status_code=201)
def request_to_join(
    team_id: uuid.UUID,
    payload: JoinRequestInput,
    current_user: Student,
    db: DbSession,
) -> dict[str, object]:
    return ok(
        service.request_to_join(db, current_user, team_id, payload), "Join request sent."
    )


# "me" before "{member_id}": leaving is not removing yourself by id.
@router.delete("/{team_id}/members/me")
def leave_team(
    team_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    team = service.leave_team(db, current_user, team_id)
    return ok(team, "Team disbanded." if team is None else "You left the team.")


@router.delete("/{team_id}/members/{member_id}")
def remove_member(
    team_id: uuid.UUID, member_id: uuid.UUID, current_user: Student, db: DbSession
) -> dict[str, object]:
    return ok(
        service.remove_member(db, current_user, team_id, member_id), "Member removed."
    )
