"""Phase 5E: the profile is the only place identity is written, and the only
thing a profile write can change.

Two halves. The first is authorization — who may read and edit what, and which
fields the server keeps for itself. The second is containment: a profile edit
must move a person's name, department and biography and leave every number the
engines own exactly where it was.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import UserRole, UserStatus
from tests.conftest import auth_header, make_user
from tests.test_credits import award, publish
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_integration import approved_deployment
from tests.test_portfolio import counting

seeded_rules = _seeded_rules

STUDENT_URL = "/api/v1/students/me/profile"
FACULTY_URL = "/api/v1/faculty/me/profile"

# Everything StudentProfilePage saves in one go.
STUDENT_EDIT = {
    "name": "Aarav Sharma",
    "headline": "Full-stack developer",
    "tagline": "Building for the campus",
    "bio": "Third year, happiest in a code review.",
    "department": "Computer Engineering",
    "batch": "2021-2025 (4th Yr)",
    "roll_number": "CE21-018",
    "pronouns": "He / Him",
    "location": "Mumbai, IN",
    "github": "aarav-sharma",
    "linkedin": "aarav-sharma",
    "personal_skills": ["React", "FastAPI"],
}

# Everything the faculty edit drawer saves.
FACULTY_EDIT = {
    "name": "Dr Neha Kulkarni",
    "designation": "Associate Professor",
    "department": "Computer Engineering",
    "phone": "+91 22 1234 5678",
    "bio": "Twelve years of teaching distributed systems.",
    "teaching_focus": "Distributed Systems",
    "innovation_focus": "Campus IoT",
    "office_location": "Block C-402",
    "experience_years": 12,
    "research_domains": ["Edge Computing"],
    "skills": ["Mentoring"],
    "max_teams": 15,
    "open_for_mentorship": True,
    "visibility": "institutional",
    "github": "neha-kulkarni",
    "linkedin": "neha-kulkarni",
}


def read(client: TestClient, user, url: str = STUDENT_URL) -> dict:
    response = client.get(url, headers=auth_header(client, user.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def patch(client: TestClient, user, body: dict, url: str = STUDENT_URL):
    return client.patch(url, json=body, headers=auth_header(client, user.email))


def saved(client: TestClient, user, body: dict, url: str = STUDENT_URL) -> dict:
    response = patch(client, user, body, url)
    assert response.status_code == 200, response.text
    return response.json()["data"]


# --- 1: authentication --------------------------------------------------------


@pytest.mark.parametrize("url", [STUDENT_URL, FACULTY_URL])
def test_a_profile_is_closed_to_anonymous_callers(client: TestClient, url) -> None:
    assert client.get(url).status_code == 401
    assert client.patch(url, json={"bio": "hello"}).status_code == 401


# --- 2, 3: each role reads its own -------------------------------------------


def test_a_student_reads_their_own_profile(client: TestClient, student) -> None:
    profile = read(client, student)

    assert profile["user_id"] == str(student.id)
    assert profile["name"] == student.name
    assert profile["institutional_email"] == student.email
    # Nothing has been filled in yet, and that is a profile, not a 404.
    assert profile["bio"] is None
    assert profile["personal_skills"] == []
    assert profile["visibility"] == {
        "public_profile": False,
        "show_contact": False,
        "show_socials": False,
    }


def test_a_faculty_reads_their_own_profile(client: TestClient, faculty) -> None:
    profile = read(client, faculty, FACULTY_URL)

    assert profile["user_id"] == str(faculty.id)
    assert profile["email"] == faculty.email
    assert profile["designation"] is None
    assert profile["visibility"] == "institutional"
    # Issued by the institution, so nobody has one until an admin says so.
    assert profile["faculty_id"] is None


def test_reading_a_profile_does_not_write_one(client: TestClient, db: Session, student) -> None:
    """A GET is a read. The row appears when the student first saves."""
    headers = auth_header(client, student.email)

    with counting(db) as statements:
        client.get(STUDENT_URL, headers=headers)

    assert not [row for row in statements if "student_profiles" in row and "INSERT" in row.upper()]


# --- 4: nobody edits anybody else --------------------------------------------


def test_a_profile_edit_reaches_only_the_caller(
    client: TestClient, student, other_student
) -> None:
    """There is no id to aim at, and a forged one is a parameter nobody reads."""
    saved(client, student, {"bio": "Mine."})

    spoofed = client.patch(
        STUDENT_URL,
        params={"user_id": str(other_student.id)},
        json={"bio": "Theirs."},
        headers=auth_header(client, student.email),
    )

    assert spoofed.json()["data"]["user_id"] == str(student.id)
    assert read(client, other_student)["bio"] is None


def test_the_route_takes_no_user_id(client: TestClient, student, other_student) -> None:
    headers = auth_header(client, student.email)

    for path in (f"/api/v1/students/{other_student.id}/profile", "/api/v1/profile/me"):
        assert client.get(path, headers=headers).status_code == 404, path


def test_a_role_cannot_use_the_other_roles_profile(
    client: TestClient, student, faculty
) -> None:
    assert client.get(FACULTY_URL, headers=auth_header(client, student.email)).status_code == 403
    assert client.get(STUDENT_URL, headers=auth_header(client, faculty.email)).status_code == 403


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.PRINCIPAL])
def test_an_administrator_is_not_a_student_or_a_faculty(
    client: TestClient, db: Session, institution_a, role
) -> None:
    """These routes edit *your* profile. Editing someone else's is user
    administration, which this phase does not implement."""
    officer = make_user(db, institution=institution_a, email=f"{role.value}@crce.edu", role=role)
    headers = auth_header(client, officer.email)

    for url in (STUDENT_URL, FACULTY_URL):
        assert client.get(url, headers=headers).status_code == 403
        assert client.patch(url, json={"bio": "x"}, headers=headers).status_code == 403


# --- 5, 21: institutions ------------------------------------------------------


def test_a_profile_never_crosses_the_institution_boundary(
    client: TestClient, db: Session, student, institution_b
) -> None:
    stranger = make_user(db, institution=institution_b, email="kiran@other.edu")
    saved(client, student, {"bio": "CRCE.", "department": "Computer Engineering"})
    saved(client, stranger, {"bio": "Elsewhere.", "department": "Mechanical"})

    theirs = read(client, stranger)

    assert theirs["bio"] == "Elsewhere."
    assert read(client, student)["bio"] == "CRCE."
    assert theirs["user_id"] == str(stranger.id)


# --- 6, 7, 8, 9: what the server keeps ---------------------------------------


@pytest.mark.parametrize(
    "forged",
    [
        {"role": "admin"},
        {"institution_id": str(uuid.uuid4())},
        {"user_id": str(uuid.uuid4())},
        {"id": str(uuid.uuid4())},
        {"status": "suspended"},
        {"password": "hunter2hunter2"},
        {"password_hash": "$2b$12$abcdefghijklmnopqrstuv"},
        {"institutional_email": "aarav@elsewhere.edu"},
        {"total_credits": 9999},
        {"level": 9},
        {"rank": 1},
        {"badge": "Legend"},
        {"projects_completed": 40},
        {"published": True},
        {"created_at": "2020-01-01T00:00:00Z"},
    ],
)
def test_a_field_the_profile_does_not_own_is_rejected(
    client: TestClient, student, forged
) -> None:
    """`extra="forbid"`: an unowned field is a 422, never a silent no-op."""
    response = patch(client, student, {"bio": "Legitimate."} | forged)

    assert response.status_code == 422, response.text
    assert response.json()["error_code"] == "VALIDATION_ERROR"


def test_the_rejected_edit_wrote_nothing(client: TestClient, db: Session, student) -> None:
    patch(client, student, {"bio": "Legitimate.", "role": "admin"})
    db.refresh(student)

    assert student.role is UserRole.STUDENT
    assert read(client, student)["bio"] is None


def test_a_faculty_cannot_change_their_login_address(
    client: TestClient, db: Session, faculty
) -> None:
    """The drawer echoes the address back; changing it is an admin act."""
    unchanged = patch(client, faculty, FACULTY_EDIT | {"email": faculty.email}, FACULTY_URL)
    changed = patch(client, faculty, {"email": "neha@elsewhere.edu"}, FACULTY_URL)
    db.refresh(faculty)

    assert unchanged.status_code == 200, unchanged.text
    assert changed.status_code == 403
    assert faculty.email == "neha.kulkarni@crce.edu"


def test_avatar_initials_follow_the_name_and_not_the_payload(
    client: TestClient, faculty
) -> None:
    """A stale copy from the form cannot contradict a rename in the same save."""
    edit = {"name": "Neha Kulkarni", "avatar_initials": "ZZ"}
    profile = saved(client, faculty, edit, FACULTY_URL)

    assert profile["avatar_initials"] == "NK"


# --- 10, 11, 12: editing ------------------------------------------------------


def test_a_student_saves_every_field_the_page_offers(client: TestClient, student) -> None:
    profile = saved(client, student, STUDENT_EDIT)

    for field, value in STUDENT_EDIT.items():
        assert profile[field] == value, field
    assert read(client, student) == profile


def test_a_faculty_saves_every_field_the_drawer_offers(client: TestClient, faculty) -> None:
    profile = saved(client, faculty, FACULTY_EDIT, FACULTY_URL)

    for field, value in FACULTY_EDIT.items():
        assert profile[field] == value, field
    assert read(client, faculty, FACULTY_URL) == profile


def test_a_partial_save_leaves_the_rest_alone(client: TestClient, student) -> None:
    saved(client, student, STUDENT_EDIT)

    profile = saved(client, student, {"headline": "Backend developer"})

    assert profile["headline"] == "Backend developer"
    assert profile["bio"] == STUDENT_EDIT["bio"]
    assert profile["personal_skills"] == STUDENT_EDIT["personal_skills"]
    assert profile["department"] == STUDENT_EDIT["department"]


def test_visibility_is_saved_whole(client: TestClient, student) -> None:
    """The frozen toggle sends all three flags every time one of them moves."""
    flags = {"public_profile": True, "show_contact": False, "show_socials": True}

    profile = saved(client, student, {"visibility": flags})

    assert profile["visibility"] == flags
    assert read(client, student)["visibility"] == flags


def test_an_explicit_null_clears_a_field(client: TestClient, student) -> None:
    saved(client, student, STUDENT_EDIT)

    profile = saved(client, student, {"tagline": None})

    assert profile["tagline"] is None
    assert profile["bio"] == STUDENT_EDIT["bio"]


@pytest.mark.parametrize(
    "bad",
    [
        {"github": "javascript:alert(1)"},
        {"github": "https://github.com/aarav"},
        {"linkedin": "in/aarav-sharma"},
        {"linkedin": "data:text/html,x"},
        {"github": "../../etc/passwd"},
        {"github": ""},
        {"name": "A"},
        {"personal_skills": [""]},
        {"visibility": {"public_profile": True}},
        {"bio": "x" * 2001},
    ],
)
def test_a_malformed_value_is_rejected(client: TestClient, student, bad) -> None:
    """Socials are handles, printed as `@name`. No scheme can become a link."""
    assert patch(client, student, bad).status_code == 422


@pytest.mark.parametrize(
    "bad", [{"max_teams": 0}, {"experience_years": -1}, {"visibility": "world"}]
)
def test_a_malformed_faculty_value_is_rejected(client: TestClient, faculty, bad) -> None:
    assert patch(client, faculty, bad, FACULTY_URL).status_code == 422


# --- 13, 14, 15: department ---------------------------------------------------


def test_department_belongs_to_the_person_not_their_work(
    client: TestClient, db: Session, student, problem
) -> None:
    """`problems.department` describes a problem. It is not evidence about who
    solved it, so it is never read here."""
    saved(client, student, {"department": "Computer Engineering"})
    problem.department = "Mechanical"
    db.flush()
    db.refresh(student)

    assert student.department == "Computer Engineering"
    assert read(client, student)["department"] == "Computer Engineering"


def test_an_account_from_before_the_migration_is_still_valid(
    client: TestClient, db: Session, institution_a
) -> None:
    """Nothing was backfilled: an untouched account reads as an empty profile."""
    legacy = make_user(db, institution=institution_a, email="legacy@crce.edu")

    profile = read(client, legacy)

    assert legacy.department is None
    assert profile["department"] is None
    assert profile["visibility"]["public_profile"] is False


def test_the_portfolio_reads_the_department_the_profile_owns(
    client: TestClient, student, faculty
) -> None:
    """One department, stored once, shown wherever it is needed."""
    saved(client, student, {"department": "Computer Engineering"})
    saved(client, faculty, {"department": "Information Technology"}, FACULTY_URL)

    for user, expected in ((student, "Computer Engineering"), (faculty, "Information Technology")):
        page = client.get("/api/v1/portfolio/me", headers=auth_header(client, user.email))
        assert page.json()["data"]["department"] == expected


def test_an_empty_department_clears_rather_than_stores_blank(
    client: TestClient, db: Session, student
) -> None:
    saved(client, student, {"department": "Computer Engineering"})

    saved(client, student, {"department": ""})
    db.refresh(student)

    assert student.department is None


# --- 16, 17, 18, 19: a profile edit owns nothing else -------------------------


def engines(client: TestClient, user, project_id: str) -> dict:
    """Every number a profile must not be able to move."""
    headers = auth_header(client, user.email)
    portfolio = client.get("/api/v1/portfolio/me", headers=headers).json()["data"]
    return {
        "credits": client.get("/api/v1/credits/summary", headers=headers).json()["data"],
        "history": client.get("/api/v1/credits/history", headers=headers).json()["data"],
        # The scored columns only: name and department are labels the profile is
        # supposed to move, and a separate test watches them do it.
        "leaderboard": [
            (row["rank"], row["credits"], row["contributions"], row["badge"])
            for row in client.get(
                "/api/v1/leaderboard/students", headers=headers
            ).json()["data"]
        ],
        "project": client.get(f"/api/v1/projects/{project_id}", headers=headers).json()["data"],
        "journey": client.get(
            f"/api/v1/projects/{project_id}/journey", headers=headers
        ).json()["data"],
        "solutions": client.get("/api/v1/solutions", headers=headers).json()["data"],
        "stats": portfolio["stats"],
        "total_credits": portfolio["total_credits"],
        "projects": portfolio["projects"],
    }


def test_editing_a_profile_moves_nothing_an_engine_owns(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    """The whole lifecycle, then a full profile rewrite, then the same numbers.

    Credits, rank, project completion and publication all keep their own
    sources; the profile supplies identity to them and takes nothing back.
    """
    project_id = approved_deployment(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    assert publish(client, faculty, project_id).status_code == 200

    before = engines(client, student, project_id)
    saved(client, student, STUDENT_EDIT | {"personal_skills": ["Rust", "Postgres"]})
    saved(client, student, {"visibility": {
        "public_profile": True, "show_contact": True, "show_socials": True
    }})
    after = engines(client, student, project_id)

    assert before["credits"]["total"] > 0
    assert before["project"]["completed_at"] is not None
    assert before["journey"]["published"] is True
    assert after == before


def test_a_rename_reaches_the_leaderboard_without_touching_the_ranking(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Display data follows the profile. The order does not."""
    project_id = approved_deployment(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    headers = auth_header(client, student.email)
    before = client.get("/api/v1/leaderboard/students", headers=headers).json()["data"]

    saved(client, student, {"name": "Aarav R Sharma", "department": "Computer Engineering"})
    after = client.get("/api/v1/leaderboard/students", headers=headers).json()["data"]

    assert [(row["rank"], row["credits"]) for row in after] == [
        (row["rank"], row["credits"]) for row in before
    ]
    assert after[0]["name"] == "Aarav R Sharma"
    # The board's department filter reads the same field, and only to label.
    assert before[0]["department"] is None
    assert after[0]["department"] == "Computer Engineering"


# --- 20: the account has to be usable -----------------------------------------


def test_a_suspended_user_has_no_profile_to_read(
    client: TestClient, db: Session, student
) -> None:
    """The existing auth rule decides this, not a second check in this module."""
    headers = auth_header(client, student.email)
    student.status = UserStatus.SUSPENDED
    db.flush()

    assert client.get(STUDENT_URL, headers=headers).status_code == 401
    assert client.patch(STUDENT_URL, json={"bio": "x"}, headers=headers).status_code == 401


# --- 22: cost -----------------------------------------------------------------


def test_a_profile_read_costs_the_same_however_full_the_profile_is(
    client: TestClient, db: Session, student
) -> None:
    """One statement for the profile row. Nothing per skill, per link or per flag."""
    headers = auth_header(client, student.email)

    def cost() -> int:
        with counting(db) as statements:
            client.get(STUDENT_URL, headers=headers)
        return len([row for row in statements if row.upper().startswith("SELECT")])

    empty = cost()
    saved(client, student, STUDENT_EDIT | {"personal_skills": [f"S{n}" for n in range(30)]})
    full = cost()

    assert empty == full
    assert full == 1, "the profile row, and the user row the token already resolved"
