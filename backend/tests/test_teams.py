"""Team formation: roster, capacity, invitations and join requests."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from tests.conftest import auth_header, make_problem, make_user

JOIN_MESSAGE = {"message": "I have shipped two computer-vision projects already."}


def create_team(client: TestClient, student, problem, name: str = "Team Alpha") -> dict:
    response = client.post(
        "/api/v1/teams",
        json={
            "problem_id": str(problem.id),
            "name": name,
            "pitch": "Edge inference on a Raspberry Pi.",
            "looking_for": ["ML Engineer"],
        },
        headers=auth_header(client, student.email),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_creator_becomes_lead_and_first_member(
    client: TestClient, student, problem
) -> None:
    team = create_team(client, student, problem)

    assert team["leader_id"] == str(student.id)
    assert [member["role"] for member in team["members"]] == ["Team Lead"]
    assert team["members"][0]["avatar_initials"] == "AS"
    # Capacity comes from the problem: 4 seats, one taken.
    assert team["open_spots"] == 3
    assert team["status"] == "recruiting"
    assert team["can_manage"] is True
    assert team["mine"] is True


def test_one_team_per_student_per_problem(client: TestClient, student, problem) -> None:
    create_team(client, student, problem)

    response = client.post(
        "/api/v1/teams",
        json={
            "problem_id": str(problem.id),
            "name": "Team Beta",
            "pitch": "A second attempt at the same problem.",
            "looking_for": [],
        },
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 409
    assert response.json()["message"] == "You are already on a team for this problem."


def test_a_student_may_lead_teams_on_different_problems(
    client: TestClient, db: Session, institution_a, faculty, student, problem
) -> None:
    other_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Water Reuse"
    )
    create_team(client, student, problem)

    second = create_team(client, student, other_problem, name="Team Gamma")

    assert second["problem_id"] == str(other_problem.id)


def test_only_the_lead_invites_and_duplicates_are_refused(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    invite = {"email": other_student.email, "role": "ML Engineer"}

    not_lead = client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json=invite,
        headers=auth_header(client, other_student.email),
    )
    first = client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json=invite,
        headers=auth_header(client, student.email),
    )
    duplicate = client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json=invite,
        headers=auth_header(client, student.email),
    )

    assert not_lead.status_code == 403
    assert first.json()["data"]["pending_invites"][0]["email"] == other_student.email
    assert duplicate.status_code == 409
    assert duplicate.json()["message"] == "That student has already been invited."


def test_accepting_an_invitation_seats_the_student(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": other_student.email, "role": "ML Engineer"},
        headers=auth_header(client, student.email),
    )
    invitee = auth_header(client, other_student.email)

    inbox = client.get("/api/v1/teams/invitations", headers=invitee).json()["data"]
    assert inbox[0]["project_title"] == "Smart Attendance System"
    remaining = client.post(
        f"/api/v1/teams/invitations/{inbox[0]['id']}/accept", headers=invitee
    ).json()["data"]

    assert remaining == []
    seated = client.get(f"/api/v1/teams/{team['id']}", headers=invitee).json()["data"]
    assert len(seated["members"]) == 2
    assert seated["open_spots"] == 2
    assert seated["can_manage"] is False


def test_join_request_flow(client: TestClient, student, other_student, problem) -> None:
    team = create_team(client, student, problem)
    applicant = auth_header(client, other_student.email)

    first = client.post(
        f"/api/v1/teams/{team['id']}/join-requests", json=JOIN_MESSAGE, headers=applicant
    )
    duplicate = client.post(
        f"/api/v1/teams/{team['id']}/join-requests", json=JOIN_MESSAGE, headers=applicant
    )

    assert first.json()["data"]["join_requested"] is True
    assert duplicate.status_code == 409

    lead = auth_header(client, student.email)
    pending = client.get("/api/v1/teams/mine/join-requests", headers=lead).json()["data"]
    assert pending[0]["student_name"] == other_student.name

    left = client.post(
        f"/api/v1/teams/join-requests/{pending[0]['id']}/accept", headers=lead
    ).json()["data"]

    assert left == []
    seated = client.get(f"/api/v1/teams/{team['id']}", headers=lead).json()["data"]
    assert len(seated["members"]) == 2


def test_join_requests_are_only_visible_to_the_lead(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json=JOIN_MESSAGE,
        headers=auth_header(client, other_student.email),
    )

    outsider_view = client.get(
        "/api/v1/teams/mine/join-requests", headers=auth_header(client, other_student.email)
    ).json()["data"]

    assert outsider_view == []


def test_a_full_team_cannot_be_joined(
    client: TestClient, db: Session, institution_a, faculty, student, other_student
) -> None:
    solo_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Solo only", team_size=1
    )
    team = create_team(client, student, solo_problem)

    response = client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json=JOIN_MESSAGE,
        headers=auth_header(client, other_student.email),
    )

    assert response.status_code == 409
    assert response.json()["message"] == "This team has no open slots."


def test_short_join_message_is_rejected(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)

    response = client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json={"message": "let me in"},
        headers=auth_header(client, other_student.email),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "message"


def test_lead_removes_a_member_but_never_themselves(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    client.post(
        f"/api/v1/teams/{team['id']}/invitations",
        json={"email": other_student.email, "role": "ML Engineer"},
        headers=auth_header(client, student.email),
    )
    invitee = auth_header(client, other_student.email)
    inbox = client.get("/api/v1/teams/invitations", headers=invitee).json()["data"]
    client.post(f"/api/v1/teams/invitations/{inbox[0]['id']}/accept", headers=invitee)
    lead = auth_header(client, student.email)

    removed = client.delete(
        f"/api/v1/teams/{team['id']}/members/{other_student.id}", headers=lead
    )
    self_removal = client.delete(
        f"/api/v1/teams/{team['id']}/members/{student.id}", headers=lead
    )

    assert len(removed.json()["data"]["members"]) == 1
    assert removed.json()["data"]["open_spots"] == 3
    assert self_removal.status_code == 409
    assert self_removal.json()["message"] == "The team lead cannot be removed."


def test_lead_must_hand_over_before_leaving(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json=JOIN_MESSAGE,
        headers=auth_header(client, other_student.email),
    )
    lead = auth_header(client, student.email)
    pending = client.get("/api/v1/teams/mine/join-requests", headers=lead).json()["data"]
    client.post(f"/api/v1/teams/join-requests/{pending[0]['id']}/accept", headers=lead)

    response = client.delete(f"/api/v1/teams/{team['id']}/members/me", headers=lead)

    assert response.status_code == 409
    assert response.json()["message"] == (
        "Hand the team lead role to another member before leaving."
    )


def test_the_last_member_out_disbands_the_team(
    client: TestClient, student, problem
) -> None:
    team = create_team(client, student, problem)
    headers = auth_header(client, student.email)

    response = client.delete(f"/api/v1/teams/{team['id']}/members/me", headers=headers)

    assert response.json()["data"] is None
    assert client.get("/api/v1/teams", headers=headers).json()["data"] == []
    assert client.get(f"/api/v1/teams/{team['id']}", headers=headers).status_code == 404


def test_teams_are_listed_per_problem_and_per_institution(
    client: TestClient, db: Session, institution_a, institution_b, faculty, student, problem
) -> None:
    create_team(client, student, problem)
    other_faculty = make_user(
        db, institution=institution_b, email="other.faculty@other.edu", role=UserRole.FACULTY
    )
    other_problem = make_problem(db, institution=institution_b, author=other_faculty)
    outsider = make_user(db, institution=institution_b, email="outsider@other.edu")
    create_team(client, outsider, other_problem, name="Their Team")

    mine = client.get(
        f"/api/v1/teams?problem_id={problem.id}", headers=auth_header(client, student.email)
    ).json()["data"]
    everything = client.get(
        "/api/v1/teams", headers=auth_header(client, student.email)
    ).json()["data"]

    assert [team["name"] for team in mine] == ["Team Alpha"]
    assert [team["name"] for team in everything] == ["Team Alpha"]


def test_faculty_cannot_form_teams(client: TestClient, faculty, problem) -> None:
    response = client.post(
        "/api/v1/teams",
        json={
            "problem_id": str(problem.id),
            "name": "Faculty Team",
            "pitch": "Faculty should not be here.",
            "looking_for": [],
        },
        headers=auth_header(client, faculty.email),
    )

    assert response.status_code == 403
