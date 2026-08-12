"""The project space: journey composition and the stage gates."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SelectionStatus, SubmissionStage, SubmissionStatus
from app.modules.projects.models import Project, StageSubmission
from tests.conftest import auth_header
from tests.test_applications import IDEA, apply

POC = {
    "description": "A working prototype recognises five volunteers at the door.",
    "github_url": "https://github.com/example/edge-attendance",
    "prototype_images": ["https://example.edu/shot.png"],
    "documents": [],
}

FINAL = {
    "description": "The finished system runs in two lecture halls every weekday.",
    "github_url": "https://github.com/example/edge-attendance",
    "tech_stack": ["Python", "ONNX"],
    "screenshots": [],
    "documents": [],
}


def open_project(client: TestClient, student, problem) -> str:
    return apply(client, student, problem).json()["data"]["id"]


def test_journey_starts_on_a_draft_idea_with_the_seven_step_timeline(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = open_project(client, student, problem)

    journey = client.get(
        f"/api/v1/projects/{project_id}/journey", headers=auth_header(client, student.email)
    ).json()["data"]

    assert journey["current_stage"] == "idea"
    assert journey["unlocked_stages"] == ["idea"]
    assert journey["idea"]["status"] == "draft"
    assert journey["idea"]["data"] is None
    assert journey["selection"]["status"] == SelectionStatus.NOT_REVIEWED.value
    assert journey["team_name"] == "Individual entry"
    assert journey["problem_title"] == problem.title
    assert journey["mentor_name"] == faculty.name
    assert [step["label"] for step in journey["timeline"]] == [
        "Idea Submitted",
        "Idea Approved",
        "PoC Submitted",
        "PoC Approved",
        "Selected for Final Development",
        "Final Submitted",
        "Completed",
    ]
    assert not any(step["done"] for step in journey["timeline"])


def test_saving_a_draft_keeps_the_stage_editable(
    client: TestClient, student, problem
) -> None:
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)

    saved = client.put(f"/api/v1/projects/{project_id}/idea", json=IDEA, headers=headers)
    again = client.put(f"/api/v1/projects/{project_id}/idea", json=IDEA, headers=headers)

    assert saved.json()["data"]["idea"]["status"] == "draft"
    assert saved.json()["data"]["idea"]["data"]["title"] == IDEA["title"]
    assert saved.json()["data"]["idea"]["saved_at"]
    assert saved.json()["data"]["idea"]["submitted_at"] is None
    assert again.status_code == 200


def test_a_submitted_stage_cannot_be_overwritten(
    client: TestClient, student, problem
) -> None:
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)

    submitted = client.put(
        f"/api/v1/projects/{project_id}/idea?submit=true", json=IDEA, headers=headers
    ).json()["data"]
    again = client.put(f"/api/v1/projects/{project_id}/idea", json=IDEA, headers=headers)

    assert submitted["idea"]["status"] == "submitted"
    assert submitted["idea"]["submitted_at"]
    assert submitted["unlocked_stages"] == ["idea", "poc"]
    assert submitted["current_stage"] == "poc"
    assert submitted["status"] == "idea_submitted"
    assert submitted["timeline"][0]["done"] is True
    assert again.status_code == 409
    assert again.json()["message"] == "Your idea is already with faculty for review."


def test_the_poc_stage_waits_for_the_idea(client: TestClient, student, problem) -> None:
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)

    too_early = client.put(
        f"/api/v1/projects/{project_id}/proof-of-concept", json=POC, headers=headers
    )
    client.put(f"/api/v1/projects/{project_id}/idea?submit=true", json=IDEA, headers=headers)
    allowed = client.put(
        f"/api/v1/projects/{project_id}/proof-of-concept?submit=true",
        json=POC,
        headers=headers,
    )

    assert too_early.status_code == 409
    assert too_early.json()["message"] == "Submit your idea before the proof of concept."
    assert allowed.json()["data"]["poc"]["status"] == "submitted"
    assert allowed.json()["data"]["unlocked_stages"] == ["idea", "poc", "selection"]
    assert allowed.json()["data"]["current_stage"] == "selection"


def test_the_final_stage_waits_for_selection(
    client: TestClient, db: Session, student, problem
) -> None:
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)
    client.put(f"/api/v1/projects/{project_id}/idea?submit=true", json=IDEA, headers=headers)
    client.put(
        f"/api/v1/projects/{project_id}/proof-of-concept?submit=true",
        json=POC,
        headers=headers,
    )

    too_early = client.put(
        f"/api/v1/projects/{project_id}/final", json=FINAL, headers=headers
    )
    # Selection is faculty's decision (Phase 4); Phase 3 only reads it.
    db.get(Project, project_id).selection_status = SelectionStatus.SELECTED
    db.flush()
    allowed = client.put(
        f"/api/v1/projects/{project_id}/final?submit=true", json=FINAL, headers=headers
    )

    assert too_early.status_code == 409
    assert too_early.json()["message"] == (
        "Only teams selected for final development can submit a final project."
    )
    journey = allowed.json()["data"]
    assert journey["final"]["status"] == "submitted"
    assert journey["status"] == "final_submitted"
    assert journey["unlocked_stages"] == ["idea", "poc", "selection", "final"]


def test_progress_and_status_follow_the_approved_stages(
    client: TestClient, db: Session, student, problem
) -> None:
    project_id = open_project(client, student, problem)
    headers = auth_header(client, student.email)
    client.put(f"/api/v1/projects/{project_id}/idea?submit=true", json=IDEA, headers=headers)

    in_review = client.get(f"/api/v1/projects/{project_id}", headers=headers).json()["data"]
    idea = db.query(StageSubmission).filter_by(
        project_id=project_id, stage=SubmissionStage.IDEA
    ).one()
    idea.status = SubmissionStatus.APPROVED
    db.flush()
    approved = client.get(f"/api/v1/projects/{project_id}", headers=headers).json()["data"]

    assert (in_review["status"], in_review["progress"]) == ("in_review", 0)
    assert (approved["status"], approved["progress"]) == ("active", 25)
    assert approved["stage"] == "poc"


def test_only_members_reach_a_project(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    project_id = open_project(client, student, problem)

    outsider = auth_header(client, other_student.email)
    assert client.get(f"/api/v1/projects/{project_id}", headers=outsider).status_code == 403
    assert (
        client.get(f"/api/v1/projects/{project_id}/journey", headers=outsider).status_code
        == 403
    )
    assert (
        client.put(
            f"/api/v1/projects/{project_id}/idea", json=IDEA, headers=outsider
        ).status_code
        == 403
    )
    # The mentor reads the workspace they are responsible for.
    assert (
        client.get(
            f"/api/v1/projects/{project_id}", headers=auth_header(client, faculty.email)
        ).status_code
        == 200
    )


def test_lists_are_scoped_to_the_caller(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    open_project(client, student, problem)

    mine = client.get("/api/v1/projects", headers=auth_header(client, student.email)).json()
    theirs = client.get(
        "/api/v1/projects", headers=auth_header(client, other_student.email)
    ).json()
    mentored = client.get(
        "/api/v1/projects", headers=auth_header(client, faculty.email)
    ).json()

    assert len(mine["data"]) == 1
    assert theirs["data"] == []
    assert len(mentored["data"]) == 1


def test_stage_payloads_are_validated(client: TestClient, student, problem) -> None:
    project_id = open_project(client, student, problem)

    response = client.put(
        f"/api/v1/projects/{project_id}/proof-of-concept",
        json=POC | {"github_url": "not-a-url", "description": "short"},
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 422
    assert {error["field"] for error in response.json()["errors"]} == {
        "github_url",
        "description",
    }
