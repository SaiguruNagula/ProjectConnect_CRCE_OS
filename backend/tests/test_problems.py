"""Problem catalog, creation, drafts and bookmarks."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import ProblemStatus, UserRole
from tests.conftest import auth_header, make_problem, make_user

VALID_PROBLEM = {
    "title": "Campus Energy Dashboard",
    "department": "Electronics",
    "summary": "Real-time electricity monitoring across campus blocks.",
    "statement": "Nobody can see which block wastes power, so nothing gets fixed.",
    "difficulty": "Advanced",
    "skills": ["IoT", "React"],
    "team_size": 3,
    "registration_date": date.today().isoformat(),
    "deadline_date": (date.today() + timedelta(days=70)).isoformat(),
    "base_credits": 300,
}


def test_catalog_lists_only_the_callers_institution(
    client: TestClient, db: Session, institution_a, institution_b, faculty, student
) -> None:
    make_problem(db, institution=institution_a, author=faculty)
    outsider = make_user(
        db, institution=institution_b, email="other.faculty@other.edu", role=UserRole.FACULTY
    )
    make_problem(
        db, institution=institution_b, author=outsider, title="Someone else's problem"
    )

    body = client.get(
        "/api/v1/problems", headers=auth_header(client, student.email)
    ).json()["data"]

    assert body["total"] == 1
    assert body["items"][0]["title"] == "Smart Attendance System"


def test_catalog_paginates_and_clamps_the_page(
    client: TestClient, db: Session, institution_a, faculty, student
) -> None:
    for index in range(5):
        make_problem(db, institution=institution_a, author=faculty, title=f"Problem {index}")

    body = client.get(
        "/api/v1/problems?page=9&limit=2", headers=auth_header(client, student.email)
    ).json()["data"]

    # Past the end the API serves the last page rather than an empty list.
    assert (body["total"], body["total_pages"], body["page"]) == (5, 3, 3)
    assert len(body["items"]) == 1


def test_catalog_search_covers_faculty_name_and_department(
    client: TestClient, db: Session, institution_a, faculty, student
) -> None:
    make_problem(db, institution=institution_a, author=faculty)
    make_problem(
        db,
        institution=institution_a,
        author=faculty,
        title="Water Reuse",
        department="Civil",
    )
    headers = auth_header(client, student.email)

    by_department = client.get("/api/v1/problems?search=civil", headers=headers).json()
    by_faculty = client.get("/api/v1/problems?search=neha", headers=headers).json()

    assert [item["title"] for item in by_department["data"]["items"]] == ["Water Reuse"]
    assert by_faculty["data"]["total"] == 2


def test_facets_and_stats_describe_the_whole_catalog_not_the_page(
    client: TestClient, db: Session, institution_a, faculty, student
) -> None:
    make_problem(db, institution=institution_a, author=faculty)
    make_problem(
        db, institution=institution_a, author=faculty, title="Water Reuse", department="Civil"
    )

    body = client.get(
        "/api/v1/problems?department=Civil&limit=1", headers=auth_header(client, student.email)
    ).json()["data"]

    assert body["total"] == 1
    assert sorted(body["departments"]) == ["Civil", "Computer Engineering"]
    assert body["stats"] == {"problems": 2, "departments": 2, "teams": 0}


def test_sort_by_credits(
    client: TestClient, db: Session, institution_a, faculty, student
) -> None:
    make_problem(db, institution=institution_a, author=faculty, base_credits=100)
    make_problem(
        db, institution=institution_a, author=faculty, title="Richest", base_credits=900
    )

    body = client.get(
        "/api/v1/problems?sort=credits", headers=auth_header(client, student.email)
    ).json()["data"]

    assert body["items"][0]["title"] == "Richest"


def test_bookmark_round_trip_and_saved_only_filter(
    client: TestClient, problem, student
) -> None:
    headers = auth_header(client, student.email)

    saved = client.put(f"/api/v1/problems/{problem.id}/bookmark", headers=headers).json()
    assert saved["data"]["bookmarked"] is True
    only_saved = client.get("/api/v1/problems?saved_only=true", headers=headers).json()
    assert only_saved["data"]["total"] == 1

    client.delete(f"/api/v1/problems/{problem.id}/bookmark", headers=headers)
    assert client.get("/api/v1/problems?saved_only=true", headers=headers).json()["data"][
        "total"
    ] == 0


def test_faculty_creates_a_problem_that_publishes_as_open(
    client: TestClient, faculty
) -> None:
    response = client.post(
        "/api/v1/problems",
        json=VALID_PROBLEM,
        headers=auth_header(client, faculty.email),
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["status"] == ProblemStatus.OPEN.value
    assert data["faculty_name"] == faculty.name
    assert data["faculty_id"] == str(faculty.id)
    # 70 days rounds to the nearest whole week.
    assert data["timeline_weeks"] == 10
    assert data["current_team_count"] == 0
    assert len(data["timeline"]) == 2


def test_client_supplied_derived_fields_are_ignored(client: TestClient, faculty) -> None:
    payload = VALID_PROBLEM | {
        "faculty_name": "Professor Nobody",
        "applicants_count": 99,
        "status": "closed",
        "institution_id": "00000000-0000-0000-0000-000000000000",
    }

    data = client.post(
        "/api/v1/problems", json=payload, headers=auth_header(client, faculty.email)
    ).json()["data"]

    assert data["faculty_name"] == faculty.name
    assert data["applicants_count"] == 0
    assert data["status"] == ProblemStatus.OPEN.value


def test_students_cannot_create_problems(client: TestClient, student) -> None:
    response = client.post(
        "/api/v1/problems", json=VALID_PROBLEM, headers=auth_header(client, student.email)
    )
    assert response.status_code == 403


def test_deadline_before_registration_is_rejected(client: TestClient, faculty) -> None:
    payload = VALID_PROBLEM | {
        "deadline_date": (date.today() - timedelta(days=1)).isoformat()
    }

    response = client.post(
        "/api/v1/problems", json=payload, headers=auth_header(client, faculty.email)
    )

    assert response.status_code == 422
    assert response.json()["errors"]


def test_drafts_are_private_to_their_author(
    client: TestClient, db: Session, institution_a, faculty
) -> None:
    other_faculty = make_user(
        db, institution=institution_a, email="priya.nair@crce.edu", role=UserRole.FACULTY
    )
    client.post(
        "/api/v1/problems/drafts",
        json=VALID_PROBLEM,
        headers=auth_header(client, faculty.email),
    )

    mine = client.get(
        "/api/v1/problems/drafts", headers=auth_header(client, faculty.email)
    ).json()["data"]
    theirs = client.get(
        "/api/v1/problems/drafts", headers=auth_header(client, other_faculty.email)
    ).json()["data"]

    assert len(mine) == 1
    assert mine[0]["input"]["title"] == VALID_PROBLEM["title"]
    assert theirs == []
