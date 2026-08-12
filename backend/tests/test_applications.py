"""Applying to a problem — and the project every application opens (ADR-1)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import ProblemStatus
from tests.conftest import auth_header, make_problem
from tests.test_teams import create_team

APPLICATION = {
    "idea_summary": "Face recognition that runs entirely on the classroom device.",
    "approach": "Train a small model, then deploy it to a Raspberry Pi at the door.",
}


def apply(client: TestClient, student, problem, **overrides):
    return client.post(
        f"/api/v1/problems/{problem.id}/applications",
        json=APPLICATION | overrides,
        headers=auth_header(client, student.email),
    )


def test_applying_opens_a_project_with_a_draft_idea(
    client: TestClient, student, problem
) -> None:
    response = apply(client, student, problem)

    assert response.status_code == 201
    project = response.json()["data"]
    assert project["problem_id"] == str(problem.id)
    assert project["team_id"] is None
    assert project["stage"] == "idea"
    assert project["stage_status"] == "draft"
    assert project["progress"] == 0
    assert project["status"] == "active"
    assert [member["role"] for member in project["members"]] == ["Individual"]

    catalog = client.get(
        f"/api/v1/problems/{problem.id}", headers=auth_header(client, student.email)
    ).json()["data"]
    assert catalog["application_status"] == "solo"
    assert catalog["applicants_count"] == 1


def test_applying_twice_is_refused(client: TestClient, student, problem) -> None:
    apply(client, student, problem)

    response = apply(client, student, problem)

    assert response.status_code == 409
    assert response.json()["message"] == "You have already applied to this problem."


def test_a_closed_problem_takes_no_applications(
    client: TestClient, db: Session, institution_a, faculty, student
) -> None:
    closed = make_problem(
        db,
        institution=institution_a,
        author=faculty,
        title="Closed problem",
        status=ProblemStatus.CLOSED,
    )

    response = apply(client, student, closed)

    assert response.status_code == 409
    assert response.json()["message"] == "This problem is closed to new applications."


def test_short_idea_and_approach_are_rejected(client: TestClient, student, problem) -> None:
    response = apply(client, student, problem, idea_summary="too short", approach="also")

    assert response.status_code == 422
    assert {error["field"] for error in response.json()["errors"]} == {
        "idea_summary",
        "approach",
    }


def test_only_the_team_lead_applies_for_the_team(
    client: TestClient, student, other_student, problem
) -> None:
    team = create_team(client, student, problem)
    client.post(
        f"/api/v1/teams/{team['id']}/join-requests",
        json={"message": "I have shipped two computer-vision projects already."},
        headers=auth_header(client, other_student.email),
    )
    lead = auth_header(client, student.email)
    pending = client.get("/api/v1/teams/mine/join-requests", headers=lead).json()["data"]
    client.post(f"/api/v1/teams/join-requests/{pending[0]['id']}/accept", headers=lead)

    by_member = apply(client, other_student, problem, team_id=team["id"])
    by_lead = apply(client, student, problem, team_id=team["id"])

    assert by_member.status_code == 403
    project = by_lead.json()["data"]
    assert project["team_id"] == team["id"]
    assert len(project["members"]) == 2
    # ADR-11: the team's status is derived from the project it now has.
    assert client.get(f"/api/v1/teams/{team['id']}", headers=lead).json()["data"][
        "status"
    ] == "applied"


def test_a_team_may_reapply_after_withdrawing(client: TestClient, student, problem) -> None:
    team = create_team(client, student, problem)
    first = apply(client, student, problem, team_id=team["id"]).json()["data"]["id"]
    client.delete(
        f"/api/v1/problems/{problem.id}/applications/me",
        headers=auth_header(client, student.email),
    )

    # ADR-12 forbids two *live* projects per team and problem; the withdrawn one
    # is soft-deleted, so the seat is free again.
    again = apply(client, student, problem, team_id=team["id"])

    assert again.status_code == 201
    assert again.json()["data"]["id"] != first


def test_applying_with_another_teams_id_is_refused(
    client: TestClient, db: Session, institution_a, faculty, student, other_student, problem
) -> None:
    other_problem = make_problem(
        db, institution=institution_a, author=faculty, title="Water Reuse"
    )
    team = create_team(client, other_student, other_problem)

    response = apply(client, student, problem, team_id=team["id"])

    assert response.status_code == 409
    assert response.json()["message"] == "That team is not working on this problem."


def test_withdrawing_soft_deletes_the_project_and_allows_reapplying(
    client: TestClient, student, problem
) -> None:
    project_id = apply(client, student, problem).json()["data"]["id"]
    headers = auth_header(client, student.email)

    withdrawn = client.delete(
        f"/api/v1/problems/{problem.id}/applications/me", headers=headers
    )

    assert withdrawn.status_code == 200
    assert client.get(f"/api/v1/projects/{project_id}", headers=headers).status_code == 404
    assert client.get("/api/v1/projects", headers=headers).json()["data"] == []
    problem_view = client.get(f"/api/v1/problems/{problem.id}", headers=headers).json()["data"]
    assert problem_view["application_status"] == "none"
    assert problem_view["applicants_count"] == 0

    assert apply(client, student, problem).status_code == 201


def test_a_submitted_idea_can_no_longer_be_withdrawn(
    client: TestClient, student, problem
) -> None:
    project_id = apply(client, student, problem).json()["data"]["id"]
    headers = auth_header(client, student.email)
    client.put(
        f"/api/v1/projects/{project_id}/idea?submit=true",
        json=IDEA,
        headers=headers,
    )

    response = client.delete(
        f"/api/v1/problems/{problem.id}/applications/me", headers=headers
    )

    assert response.status_code == 409


IDEA = {
    "title": "Edge Attendance",
    "problem_statement": "Roll call eats ten minutes of every single lecture slot.",
    "proposed_solution": "A door-mounted camera marks attendance as students walk in.",
    "approach": "Fine-tune a small face-embedding model and run it on-device.",
    "tech_stack": ["Python", "ONNX"],
    "expected_outcome": "Attendance captured without any lecture time lost.",
    "supporting_links": [],
}
