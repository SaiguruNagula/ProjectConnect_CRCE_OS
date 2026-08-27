"""Team formation rules — roster, invitations and join requests.

Guard messages are the mock's, verbatim, because they are what the UI shows.
Capacity is always `problem.team_size - members`: nothing stores open spots, so
nothing can disagree about them.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import InvitationStatus, JoinRequestStatus, SelectionStatus
from app.common.errors import BusinessRuleError, NotFoundError
from app.core import authorize
from app.modules.notifications import service as notifications
from app.modules.problems import repository as problems_repo
from app.modules.projects import repository as projects_repo
from app.modules.projects.models import Project
from app.modules.teams import repository as repo
from app.modules.teams.models import Team, TeamInvitation, TeamJoinRequest, TeamMember
from app.modules.teams.schemas import (
    LEAD_ROLE,
    MEMBER_ROLE,
    CreateTeamInput,
    InvitationOut,
    InviteMemberInput,
    JoinRequestInput,
    JoinRequestOut,
    TeamInviteOut,
    TeamMemberOut,
    TeamOut,
    TeamStatus,
    initials,
)
from app.modules.users.models import User

ALREADY_ON_A_TEAM = "You are already on a team for this problem."
# Solo and team participation are mutually exclusive per problem (mirrors the
# team-vs-team guard above, for the solo-vs-team direction).
ALREADY_APPLIED_SOLO = (
    "You have already applied individually to this problem — withdraw that "
    "application before joining a team for it."
)


def _status(project: Project | None) -> TeamStatus:
    """ADR-11: derived from the team's project, never stored on the team."""
    if project is None:
        return "recruiting"
    if project.completed_at is not None:
        return "completed"
    if project.selection_status is SelectionStatus.SELECTED:
        return "selected"
    return "applied"


def _compose(
    team: Team,
    *,
    viewer: User,
    member_rows: list,
    invites: list[TeamInvitation],
    capacity: int,
    project: Project | None,
    join_requested: bool,
) -> TeamOut:
    members = [
        TeamMemberOut.of(member.student_id, name, member.role)
        for member, name in member_rows
    ]
    return TeamOut(
        id=team.id,
        name=team.name,
        problem_id=team.problem_id,
        pitch=team.pitch,
        members=members,
        leader_id=team.leader_id,
        created_at=team.created_at,
        status=_status(project),
        open_spots=max(0, capacity - len(members)),
        looking_for=team.looking_for,
        pending_invites=[
            TeamInviteOut(
                id=invite.id,
                email=invite.email,
                role=invite.role,
                invited_at=invite.created_at,
            )
            for invite in invites
        ],
        can_manage=authorize.is_team_lead(viewer, team),
        mine=any(member.id == viewer.id for member in members),
        join_requested=join_requested,
    )


def _views(db: Session, teams: list[Team], viewer: User) -> list[TeamOut]:
    """One batch of lookups for any number of teams — never one per card."""
    team_ids = {team.id for team in teams}
    member_rows = repo.members_by_team(db, team_ids)
    invites = repo.pending_invites_by_team(db, team_ids)
    capacity = repo.capacities(db, {team.problem_id for team in teams})
    projects = repo.projects_by_team(db, team_ids)
    requested = repo.requested_team_ids(db, student_id=viewer.id, team_ids=team_ids)
    return [
        _compose(
            team,
            viewer=viewer,
            member_rows=member_rows.get(team.id, []),
            invites=invites.get(team.id, []),
            capacity=capacity.get(team.problem_id, 0),
            project=projects.get(team.id),
            join_requested=team.id in requested,
        )
        for team in teams
    ]


def _view(db: Session, team: Team, viewer: User) -> TeamOut:
    return _views(db, [team], viewer)[0]


def _load(db: Session, team_id: uuid.UUID, viewer: User) -> Team:
    team = repo.get(db, team_id, institution_id=viewer.institution_id)
    if team is None:
        # Also covers another institution's team: 404, never 403.
        raise NotFoundError("Team not found.")
    return team


def _open_spots(db: Session, team: Team) -> int:
    capacity = repo.capacities(db, {team.problem_id}).get(team.problem_id, 0)
    return max(0, capacity - repo.member_count(db, team.id))


def list_teams(
    db: Session, viewer: User, *, problem_id: uuid.UUID | None
) -> list[TeamOut]:
    teams = repo.list_teams(
        db, institution_id=viewer.institution_id, problem_id=problem_id
    )
    return _views(db, list(teams), viewer)


def get_team(db: Session, viewer: User, team_id: uuid.UUID) -> TeamOut:
    return _view(db, _load(db, team_id, viewer), viewer)


def create_team(db: Session, student: User, payload: CreateTeamInput) -> TeamOut:
    problem = problems_repo.get(
        db, payload.problem_id, institution_id=student.institution_id
    )
    if problem is None:
        raise NotFoundError("Problem not found.")
    if repo.membership_for_problem(
        db, student_id=student.id, problem_id=problem.id
    ):
        raise BusinessRuleError(ALREADY_ON_A_TEAM)
    if projects_repo.active_application(
        db, problem_id=problem.id, student_id=student.id
    ):
        raise BusinessRuleError(ALREADY_APPLIED_SOLO)

    team = repo.add_team(
        db,
        Team(
            institution_id=student.institution_id,
            problem_id=problem.id,
            name=payload.name.strip(),
            pitch=payload.pitch.strip(),
            leader_id=student.id,
            looking_for=[role.strip() for role in payload.looking_for if role.strip()],
        ),
    )
    # The creator is the lead and the first member, in the same transaction:
    # a team with no roster must never exist.
    repo.add_member(
        db,
        TeamMember(
            team_id=team.id,
            student_id=student.id,
            problem_id=problem.id,
            role=LEAD_ROLE,
        ),
    )
    record_audit(
        db,
        action="team.created",
        entity="team",
        entity_id=str(team.id),
        actor_id=student.id,
        institution_id=student.institution_id,
        meta={"problem_id": str(problem.id)},
    )
    db.commit()
    return _view(db, team, student)


def invite_member(
    db: Session, lead: User, team_id: uuid.UUID, payload: InviteMemberInput
) -> TeamOut:
    team = _load(db, team_id, lead)
    authorize.ensure(
        authorize.is_team_lead(lead, team), "Only the team lead can invite members."
    )
    if _open_spots(db, team) == 0:
        raise BusinessRuleError("Your team has no open slots left.")

    email = str(payload.email).strip().lower()
    if email in repo.member_emails(db, team.id):
        raise BusinessRuleError("That student is already on the team.")
    if repo.get_pending_invite(db, team_id=team.id, email=email):
        raise BusinessRuleError("That student has already been invited.")

    repo.add_invitation(
        db,
        TeamInvitation(
            team_id=team.id,
            email=email,
            role=payload.role.strip() or MEMBER_ROLE,
            invited_by=lead.id,
        ),
    )
    record_audit(
        db,
        action="team.invitation_sent",
        entity="team",
        entity_id=str(team.id),
        actor_id=lead.id,
        institution_id=lead.institution_id,
    )
    db.commit()
    return _view(db, team, lead)


def remove_member(
    db: Session, lead: User, team_id: uuid.UUID, member_id: uuid.UUID
) -> TeamOut:
    team = _load(db, team_id, lead)
    authorize.ensure(
        authorize.is_team_lead(lead, team), "Only the team lead can remove members."
    )
    if member_id == team.leader_id:
        raise BusinessRuleError("The team lead cannot be removed.")

    member = repo.get_member(db, team_id=team.id, student_id=member_id)
    if member is None:
        raise BusinessRuleError("That student is not on the team.")

    repo.remove_member(db, member)
    record_audit(
        db,
        action="team.member_removed",
        entity="team",
        entity_id=str(team.id),
        actor_id=lead.id,
        institution_id=lead.institution_id,
        meta={"member_id": str(member_id)},
    )
    db.commit()
    return _view(db, team, lead)


def leave_team(db: Session, student: User, team_id: uuid.UUID) -> TeamOut | None:
    """Returns None when the last member out disbands the team."""
    team = _load(db, team_id, student)
    member = repo.get_member(db, team_id=team.id, student_id=student.id)
    if member is None:
        raise BusinessRuleError("That student is not on the team.")

    remaining = repo.member_count(db, team.id) - 1
    if authorize.is_team_lead(student, team) and remaining > 0:
        raise BusinessRuleError(
            "Hand the team lead role to another member before leaving."
        )

    repo.remove_member(db, member)
    disbanded = remaining == 0
    if disbanded:
        # Soft delete rather than orphaning the row its project points at.
        team.deleted_at = datetime.now(UTC)
    record_audit(
        db,
        action="team.disbanded" if disbanded else "team.member_left",
        entity="team",
        entity_id=str(team.id),
        actor_id=student.id,
        institution_id=student.institution_id,
    )
    db.commit()
    return None if disbanded else _view(db, team, student)


# --- join requests -------------------------------------------------------------


def request_to_join(
    db: Session, student: User, team_id: uuid.UUID, payload: JoinRequestInput
) -> TeamOut:
    team = _load(db, team_id, student)
    if repo.get_member(db, team_id=team.id, student_id=student.id):
        raise BusinessRuleError(ALREADY_ON_A_TEAM)
    if repo.membership_for_problem(
        db, student_id=student.id, problem_id=team.problem_id
    ):
        raise BusinessRuleError(ALREADY_ON_A_TEAM)
    if projects_repo.active_application(
        db, problem_id=team.problem_id, student_id=student.id
    ):
        raise BusinessRuleError(ALREADY_APPLIED_SOLO)
    if team.id in repo.requested_team_ids(
        db, student_id=student.id, team_ids={team.id}
    ):
        raise BusinessRuleError("You have already requested to join this team.")
    if _open_spots(db, team) == 0:
        raise BusinessRuleError("This team has no open slots.")

    request = repo.add_join_request(
        db,
        TeamJoinRequest(
            team_id=team.id, student_id=student.id, message=payload.message.strip()
        ),
    )
    record_audit(
        db,
        action="team.join_requested",
        entity="team",
        entity_id=str(team.id),
        actor_id=student.id,
        institution_id=student.institution_id,
    )
    # The lead is the one who has to answer it, so the lead is the one told.
    # The duplicate-request guard above already makes this once per student.
    notifications.notify(
        db,
        user_id=team.leader_id,
        institution_id=team.institution_id,
        kind="info",
        title="Join request received",
        message=f"{student.name} asked to join {team.name}.",
        entity="team",
        entity_id=str(team.id),
        event_key=f"team.join_requested:{request.id}",
    )
    db.commit()
    return _view(db, team, student)


def list_join_requests(db: Session, lead: User) -> list[JoinRequestOut]:
    rows = repo.pending_join_requests_for_lead(
        db, leader_id=lead.id, institution_id=lead.institution_id
    )
    return [
        JoinRequestOut(
            id=request.id,
            team_id=team_id,
            team_name=team_name,
            student_id=request.student_id,
            student_name=student_name,
            avatar_initials=initials(student_name),
            message=request.message,
            requested_at=request.created_at,
        )
        for request, team_name, team_id, student_name in rows
    ]


def respond_to_join_request(
    db: Session, lead: User, request_id: uuid.UUID, *, accept: bool
) -> list[JoinRequestOut]:
    request = repo.get_join_request(db, request_id)
    team = repo.get(db, request.team_id, institution_id=lead.institution_id) if request else None
    if request is None or team is None:
        raise NotFoundError("Join request not found.")
    authorize.ensure(
        authorize.is_team_lead(lead, team),
        "Only the team lead can answer join requests.",
    )
    if request.status is not JoinRequestStatus.PENDING:
        raise BusinessRuleError("This join request has already been answered.")

    if accept:
        if _open_spots(db, team) == 0:
            raise BusinessRuleError("Your team has no open slots left.")
        if repo.membership_for_problem(
            db, student_id=request.student_id, problem_id=team.problem_id
        ):
            raise BusinessRuleError("That student is already on a team for this problem.")
        if projects_repo.active_application(
            db, problem_id=team.problem_id, student_id=request.student_id
        ):
            raise BusinessRuleError(
                "That student has already applied individually to this problem."
            )
        # Seating the student and answering the request are one unit of work.
        repo.add_member(
            db,
            TeamMember(
                team_id=team.id,
                student_id=request.student_id,
                problem_id=team.problem_id,
                role=MEMBER_ROLE,
            ),
        )
    request.status = (
        JoinRequestStatus.ACCEPTED if accept else JoinRequestStatus.REJECTED
    )
    record_audit(
        db,
        action="team.join_request_accepted" if accept else "team.join_request_rejected",
        entity="team",
        entity_id=str(team.id),
        actor_id=lead.id,
        institution_id=lead.institution_id,
        meta={"student_id": str(request.student_id)},
    )
    # The student who asked is the one waiting on the answer.
    notifications.notify(
        db,
        user_id=request.student_id,
        institution_id=team.institution_id,
        kind="success" if accept else "info",
        title="Join request accepted" if accept else "Join request declined",
        message=f"{team.name} — answered by {lead.name}.",
        entity="team",
        entity_id=str(team.id),
        # The PENDING guard above means a request is answered exactly once.
        event_key=f"team.join_answered:{request.id}",
    )
    db.commit()
    return list_join_requests(db, lead)


# --- invitations ---------------------------------------------------------------


def list_invitations(db: Session, student: User) -> list[InvitationOut]:
    rows = repo.pending_invitations_for(
        db, email=student.email, institution_id=student.institution_id
    )
    return [
        InvitationOut(
            id=invitation.id,
            project_title=problem_title,
            invited_by=inviter,
            role=invitation.role,
            team_id=team.id,
            problem_id=team.problem_id,
            project_id=project_id,
        )
        for invitation, team, problem_title, inviter, project_id in rows
    ]


def respond_to_invitation(
    db: Session, student: User, invitation_id: uuid.UUID, *, accept: bool
) -> list[InvitationOut]:
    invitation = repo.get_invitation(db, invitation_id)
    team = (
        repo.get(db, invitation.team_id, institution_id=student.institution_id)
        if invitation
        else None
    )
    # An invitation addressed to somebody else does not exist as far as the
    # caller is concerned.
    if invitation is None or team is None or invitation.email != student.email:
        raise NotFoundError("Invitation not found.")
    if invitation.status is not InvitationStatus.PENDING:
        raise BusinessRuleError("This invitation has already been answered.")

    if accept:
        if _open_spots(db, team) == 0:
            raise BusinessRuleError("This team has no open slots.")
        if repo.membership_for_problem(
            db, student_id=student.id, problem_id=team.problem_id
        ):
            raise BusinessRuleError(ALREADY_ON_A_TEAM)
        if projects_repo.active_application(
            db, problem_id=team.problem_id, student_id=student.id
        ):
            raise BusinessRuleError(ALREADY_APPLIED_SOLO)
        repo.add_member(
            db,
            TeamMember(
                team_id=team.id,
                student_id=student.id,
                problem_id=team.problem_id,
                role=invitation.role,
            ),
        )
    invitation.status = (
        InvitationStatus.ACCEPTED if accept else InvitationStatus.DECLINED
    )
    record_audit(
        db,
        action="team.invitation_accepted" if accept else "team.invitation_declined",
        entity="team",
        entity_id=str(team.id),
        actor_id=student.id,
        institution_id=student.institution_id,
    )
    db.commit()
    return list_invitations(db, student)
