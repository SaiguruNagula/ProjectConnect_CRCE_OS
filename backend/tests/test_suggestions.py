"""Problem suggestions: the student→mentor→catalog path."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import ProblemStatus, ProblemSuggestionStatus, UserRole
from tests.conftest import auth_header, make_user


def suggestion_payload(mentor_id) -> dict:
    return {
        "title": "Lab equipment booking",
        "description": (
            "Lab slots are booked on a paper register that nobody can read remotely."
        ),
        "category": "Computer Engineering",
        "importance": "Students lose entire afternoons discovering a lab is full.",
        "expected_impact": "Fewer wasted trips and honest utilisation data.",
        "mentor_id": str(mentor_id),
        "reference_links": ["https://example.edu/lab-register"],
    }


def create_suggestion(client: TestClient, student, mentor, *, submit: bool = False) -> dict:
    response = client.post(
        f"/api/v1/problem-suggestions?submit={str(submit).lower()}",
        json=suggestion_payload(mentor.id),
        headers=auth_header(client, student.email),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_draft_is_editable_then_submitted(client: TestClient, student, faculty) -> None:
    draft = create_suggestion(client, student, faculty)
    assert draft["status"] == ProblemSuggestionStatus.DRAFT.value

    edited = client.put(
        f"/api/v1/problem-suggestions/{draft['id']}?submit=true",
        json=suggestion_payload(faculty.id) | {"title": "Lab booking, revised"},
        headers=auth_header(client, student.email),
    ).json()["data"]

    assert edited["status"] == ProblemSuggestionStatus.PENDING_MENTOR_REVIEW.value
    assert edited["input"]["title"] == "Lab booking, revised"


def test_a_submitted_suggestion_cannot_be_edited(
    client: TestClient, student, faculty
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    response = client.put(
        f"/api/v1/problem-suggestions/{submitted['id']}",
        json=suggestion_payload(faculty.id),
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 409
    assert response.json()["message"] == "This suggestion is already with your mentor."


def test_mentor_must_be_faculty_of_the_same_institution(
    client: TestClient, db: Session, institution_b, student, other_student
) -> None:
    outsider = make_user(
        db, institution=institution_b, email="stranger@other.edu", role=UserRole.FACULTY
    )

    not_faculty = client.post(
        "/api/v1/problem-suggestions",
        json=suggestion_payload(other_student.id),
        headers=auth_header(client, student.email),
    )
    other_tenant = client.post(
        "/api/v1/problem-suggestions",
        json=suggestion_payload(outsider.id),
        headers=auth_header(client, student.email),
    )

    assert not_faculty.status_code == 422
    assert other_tenant.status_code == 422


def test_only_the_nominated_mentor_can_decide(
    client: TestClient, db: Session, institution_a, student, faculty
) -> None:
    other_faculty = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    submitted = create_suggestion(client, student, faculty, submit=True)

    response = client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "approved", "feedback": ""},
        headers=auth_header(client, other_faculty.email),
    )

    assert response.status_code == 403


def test_rejection_requires_feedback(client: TestClient, student, faculty) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    response = client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "rejected", "feedback": "   "},
        headers=auth_header(client, faculty.email),
    )

    assert response.status_code == 422


def test_changes_requested_reopens_editing(client: TestClient, student, faculty) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "changes_requested", "feedback": "Narrow the scope."},
        headers=auth_header(client, faculty.email),
    )
    edited = client.put(
        f"/api/v1/problem-suggestions/{submitted['id']}",
        json=suggestion_payload(faculty.id),
        headers=auth_header(client, student.email),
    )

    assert edited.status_code == 200
    assert edited.json()["data"]["status"] == ProblemSuggestionStatus.DRAFT.value


def test_approval_publishes_the_problem_in_one_transaction(
    client: TestClient, student, faculty
) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)

    decided = client.post(
        f"/api/v1/problem-suggestions/{submitted['id']}/decision",
        json={"decision": "approved", "feedback": "Good idea."},
        headers=auth_header(client, faculty.email),
    ).json()["data"]

    assert decided["status"] == ProblemSuggestionStatus.PUBLISHED.value
    published_id = decided["published_problem_id"]
    assert published_id

    problem = client.get(
        f"/api/v1/problems/{published_id}", headers=auth_header(client, student.email)
    ).json()["data"]
    # The nominated mentor owns the published problem, with the standard defaults.
    assert problem["faculty_id"] == str(faculty.id)
    assert problem["status"] == ProblemStatus.OPEN.value
    assert problem["difficulty"] == "Intermediate"
    assert problem["team_size"] == 4
    assert problem["credit_reward"] == 200
    assert problem["timeline_weeks"] == 12
    assert problem["department"] == "Computer Engineering"
    assert problem["attachments"] == [
        {"name": "Reference 1", "type": "Link", "url": "https://example.edu/lab-register"}
    ]


def test_a_decision_can_only_be_made_once(client: TestClient, student, faculty) -> None:
    submitted = create_suggestion(client, student, faculty, submit=True)
    decision = {"decision": "approved", "feedback": ""}
    headers = auth_header(client, faculty.email)

    path = f"/api/v1/problem-suggestions/{submitted['id']}/decision"

    client.post(path, json=decision, headers=headers)
    again = client.post(path, json=decision, headers=headers)

    assert again.status_code == 409


def test_mentors_never_see_another_students_draft(
    client: TestClient, student, other_student, faculty
) -> None:
    create_suggestion(client, student, faculty)
    create_suggestion(client, other_student, faculty, submit=True)

    mentor_inbox = client.get(
        "/api/v1/problem-suggestions", headers=auth_header(client, faculty.email)
    ).json()["data"]
    student_view = client.get(
        "/api/v1/problem-suggestions", headers=auth_header(client, student.email)
    ).json()["data"]

    assert [item["submitted_by"] for item in mentor_inbox] == [other_student.name]
    assert len(student_view) == 1


def test_mentor_list_is_scoped_to_the_institution(
    client: TestClient, db: Session, institution_b, student, faculty
) -> None:
    make_user(
        db, institution=institution_b, email="outsider@other.edu", role=UserRole.FACULTY
    )

    mentors = client.get(
        "/api/v1/mentors", headers=auth_header(client, student.email)
    ).json()["data"]

    assert [mentor["id"] for mentor in mentors] == [str(faculty.id)]
