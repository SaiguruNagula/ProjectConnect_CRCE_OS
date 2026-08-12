"""Team data access. Every statement is institution-scoped.

Rosters, invitations, join requests and projects are fetched by team id in
batches, so listing the teams on a problem costs a fixed number of queries
rather than one per card.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from collections.abc import Sequence

from sqlalchemy import Row, func, select
from sqlalchemy.orm import Session

from app.common.enums import InvitationStatus, JoinRequestStatus
from app.modules.problems.models import Problem
from app.modules.projects.models import Project
from app.modules.teams.models import Team, TeamInvitation, TeamJoinRequest, TeamMember
from app.modules.users.models import User


def get(db: Session, team_id: uuid.UUID, *, institution_id: uuid.UUID) -> Team | None:
    stmt = select(Team).where(
        Team.id == team_id,
        Team.institution_id == institution_id,
        Team.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_teams(
    db: Session, *, institution_id: uuid.UUID, problem_id: uuid.UUID | None
) -> Sequence[Team]:
    stmt = (
        select(Team)
        .where(Team.institution_id == institution_id, Team.deleted_at.is_(None))
        .order_by(Team.created_at.desc())
    )
    if problem_id is not None:
        stmt = stmt.where(Team.problem_id == problem_id)
    return db.execute(stmt).scalars().all()


def capacities(db: Session, problem_ids: set[uuid.UUID]) -> dict[uuid.UUID, int]:
    """Team size per problem — the only source of a team's capacity."""
    if not problem_ids:
        return {}
    rows = db.execute(
        select(Problem.id, Problem.team_size).where(Problem.id.in_(problem_ids))
    ).all()
    return {row[0]: row[1] for row in rows}


def members_by_team(
    db: Session, team_ids: set[uuid.UUID]
) -> dict[uuid.UUID, list[Row[tuple[TeamMember, str]]]]:
    if not team_ids:
        return {}
    rows = db.execute(
        select(TeamMember, User.name)
        .join(User, User.id == TeamMember.student_id)
        .where(TeamMember.team_id.in_(team_ids))
        .order_by(TeamMember.joined_at)
    ).all()
    grouped: dict[uuid.UUID, list[Row[tuple[TeamMember, str]]]] = defaultdict(list)
    for row in rows:
        grouped[row[0].team_id].append(row)
    return grouped


def pending_invites_by_team(
    db: Session, team_ids: set[uuid.UUID]
) -> dict[uuid.UUID, list[TeamInvitation]]:
    if not team_ids:
        return {}
    rows = db.execute(
        select(TeamInvitation)
        .where(
            TeamInvitation.team_id.in_(team_ids),
            TeamInvitation.status == InvitationStatus.PENDING,
        )
        .order_by(TeamInvitation.created_at)
    ).scalars()
    grouped: dict[uuid.UUID, list[TeamInvitation]] = defaultdict(list)
    for invite in rows:
        grouped[invite.team_id].append(invite)
    return grouped


def projects_by_team(db: Session, team_ids: set[uuid.UUID]) -> dict[uuid.UUID, Project]:
    """The team's live project, which is what its status is derived from."""
    if not team_ids:
        return {}
    rows = db.execute(
        select(Project).where(
            Project.team_id.in_(team_ids), Project.deleted_at.is_(None)
        )
    ).scalars()
    return {project.team_id: project for project in rows if project.team_id}


def requested_team_ids(
    db: Session, *, student_id: uuid.UUID, team_ids: set[uuid.UUID]
) -> set[uuid.UUID]:
    if not team_ids:
        return set()
    rows = db.execute(
        select(TeamJoinRequest.team_id).where(
            TeamJoinRequest.team_id.in_(team_ids),
            TeamJoinRequest.student_id == student_id,
            TeamJoinRequest.status == JoinRequestStatus.PENDING,
        )
    ).scalars()
    return set(rows)


def member_count(db: Session, team_id: uuid.UUID) -> int:
    stmt = select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)
    return db.execute(stmt).scalar_one()


def get_member(
    db: Session, *, team_id: uuid.UUID, student_id: uuid.UUID
) -> TeamMember | None:
    stmt = select(TeamMember).where(
        TeamMember.team_id == team_id, TeamMember.student_id == student_id
    )
    return db.execute(stmt).scalar_one_or_none()


def membership_for_problem(
    db: Session, *, student_id: uuid.UUID, problem_id: uuid.UUID
) -> TeamMember | None:
    """ADR-4: a student belongs to at most one team per problem."""
    stmt = select(TeamMember).where(
        TeamMember.student_id == student_id, TeamMember.problem_id == problem_id
    )
    return db.execute(stmt).scalar_one_or_none()


def member_emails(db: Session, team_id: uuid.UUID) -> set[str]:
    stmt = (
        select(User.email)
        .join(TeamMember, TeamMember.student_id == User.id)
        .where(TeamMember.team_id == team_id)
    )
    return set(db.execute(stmt).scalars().all())


def add_team(db: Session, team: Team) -> Team:
    db.add(team)
    db.flush()
    return team


def add_member(db: Session, member: TeamMember) -> TeamMember:
    db.add(member)
    db.flush()
    return member


def remove_member(db: Session, member: TeamMember) -> None:
    db.delete(member)
    db.flush()


# --- invitations --------------------------------------------------------------


def add_invitation(db: Session, invitation: TeamInvitation) -> TeamInvitation:
    db.add(invitation)
    db.flush()
    return invitation


def get_pending_invite(
    db: Session, *, team_id: uuid.UUID, email: str
) -> TeamInvitation | None:
    stmt = select(TeamInvitation).where(
        TeamInvitation.team_id == team_id,
        TeamInvitation.email == email,
        TeamInvitation.status == InvitationStatus.PENDING,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_invitation(db: Session, invitation_id: uuid.UUID) -> TeamInvitation | None:
    return db.get(TeamInvitation, invitation_id)


def pending_invitations_for(
    db: Session, *, email: str, institution_id: uuid.UUID
) -> Sequence[Row[tuple[TeamInvitation, Team, str, str, uuid.UUID | None]]]:
    """The invitee's inbox: invitation, team, problem title, inviter, project."""
    stmt = (
        select(TeamInvitation, Team, Problem.title, User.name, Project.id)
        .join(Team, Team.id == TeamInvitation.team_id)
        .join(Problem, Problem.id == Team.problem_id)
        .join(User, User.id == TeamInvitation.invited_by)
        .outerjoin(
            Project, (Project.team_id == Team.id) & (Project.deleted_at.is_(None))
        )
        .where(
            TeamInvitation.email == email,
            TeamInvitation.status == InvitationStatus.PENDING,
            Team.institution_id == institution_id,
            Team.deleted_at.is_(None),
        )
        .order_by(TeamInvitation.created_at.desc())
    )
    return db.execute(stmt).all()


# --- join requests -------------------------------------------------------------


def add_join_request(db: Session, request: TeamJoinRequest) -> TeamJoinRequest:
    db.add(request)
    db.flush()
    return request


def get_join_request(db: Session, request_id: uuid.UUID) -> TeamJoinRequest | None:
    return db.get(TeamJoinRequest, request_id)


def pending_join_requests_for_lead(
    db: Session, *, leader_id: uuid.UUID, institution_id: uuid.UUID
) -> Sequence[Row[tuple[TeamJoinRequest, str, uuid.UUID, str]]]:
    """Only a lead sees join requests, and only for the teams they lead."""
    stmt = (
        select(TeamJoinRequest, Team.name, Team.id, User.name)
        .join(Team, Team.id == TeamJoinRequest.team_id)
        .join(User, User.id == TeamJoinRequest.student_id)
        .where(
            Team.leader_id == leader_id,
            Team.institution_id == institution_id,
            Team.deleted_at.is_(None),
            TeamJoinRequest.status == JoinRequestStatus.PENDING,
        )
        .order_by(TeamJoinRequest.created_at.desc())
    )
    return db.execute(stmt).all()
