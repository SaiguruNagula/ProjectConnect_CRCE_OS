"""The leaderboard: one ledger, two views of it.

Every assertion here checks the same thing from a different angle — that the
board is `SUM(credit_transactions.points)` and nothing else. Projects, reviews,
badges and contribution counts are on the page, but none of them move a rank.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.audit import AuditLog
from app.common.enums import UserRole
from app.db.base import Base
from app.modules.credits import config
from app.modules.credits.models import CreditTransaction
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import TOTAL, approved_project, award
from tests.test_credits import seeded_rules as _seeded_rules

# The Phase 5A rule table, reused as-is. Bound under its fixture name here so
# pytest finds it in this module without a second copy of the seed.
seeded_rules = _seeded_rules


def credit(db: Session, user, points: int, *, source: str = config.SOURCE_PROJECT_COMPLETION):
    """A ledger line, written directly — the board's only input."""
    row = CreditTransaction(
        institution_id=user.institution_id,
        user_id=user.id,
        source=source,
        source_id=uuid.uuid4(),
        points=points,
        description="Ledger entry",
    )
    db.add(row)
    db.flush()
    return row


def board(client: TestClient, viewer, role: str = "students", **params):
    response = client.get(
        f"/api/v1/leaderboard/{role}",
        params=params,
        headers=auth_header(client, viewer.email),
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def names(entries) -> list[str]:
    return [entry["name"] for entry in entries]


# --- authorization ------------------------------------------------------------------


def test_the_leaderboard_is_closed_to_anonymous_callers(client: TestClient) -> None:
    for role in ("students", "faculty"):
        response = client.get(f"/api/v1/leaderboard/{role}")
        assert response.status_code == 401
        assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_the_board_is_readable_by_students_and_faculty_alike(
    client: TestClient, db: Session, student, faculty
) -> None:
    credit(db, student, 100)

    assert names(board(client, student)) == [student.name]
    assert names(board(client, faculty)) == [student.name]


def test_there_is_no_leaderboard_write_api(client: TestClient, student) -> None:
    headers = auth_header(client, student.email)
    for method in (client.post, client.put, client.patch, client.delete):
        assert method("/api/v1/leaderboard/students", headers=headers).status_code == 405


def test_the_forbidden_leaderboard_routes_do_not_exist(client: TestClient, student) -> None:
    headers = auth_header(client, student.email)
    for path in ("global", "departments", "me", str(uuid.uuid4()), "students/refresh"):
        assert client.get(f"/api/v1/leaderboard/{path}", headers=headers).status_code == 404
    for path in ("refresh", "recalculate", "rebuild"):
        assert client.post(f"/api/v1/leaderboard/{path}", headers=headers).status_code == 404


def test_there_is_no_leaderboard_table(db: Session) -> None:
    """The board is a query. Nothing stores a score or a rank."""
    assert [name for name in Base.metadata.tables if "leaderboard" in name] == []


# --- tenancy ------------------------------------------------------------------------


def test_a_board_shows_only_the_callers_institution(
    client: TestClient, db: Session, institution_a, institution_b, student
) -> None:
    outsider = make_user(db, institution=institution_b, email="ravi.menon@other.edu")
    credit(db, student, 100)
    credit(db, outsider, 900)

    assert names(board(client, student)) == [student.name]
    assert names(board(client, outsider)) == [outsider.name]


def test_a_client_supplied_institution_is_ignored(
    client: TestClient, db: Session, institution_b, student
) -> None:
    """Institution comes from the token; the query string is not part of the contract."""
    outsider = make_user(db, institution=institution_b, email="ravi.menon@other.edu")
    credit(db, student, 100)
    credit(db, outsider, 900)

    entries = board(client, student, institution_id=str(institution_b.id))

    assert names(entries) == [student.name]


def test_a_foreign_ledger_row_never_counts(
    client: TestClient, db: Session, institution_b, student
) -> None:
    """Both sides of the join are scoped, so a misfiled row cannot inflate a score."""
    credit(db, student, 100)
    db.add(
        CreditTransaction(
            institution_id=institution_b.id,
            user_id=student.id,
            source=config.SOURCE_PROJECT_COMPLETION,
            source_id=uuid.uuid4(),
            points=5000,
            description="Filed against the wrong college",
        )
    )
    db.flush()

    assert board(client, student)[0]["credits"] == 100


# --- who is on the board ------------------------------------------------------------


def test_the_student_board_holds_students_and_the_faculty_board_holds_faculty(
    client: TestClient, db: Session, student, faculty
) -> None:
    credit(db, student, 100)
    credit(db, faculty, 500)

    assert names(board(client, student, "students")) == [student.name]
    assert names(board(client, student, "faculty")) == [faculty.name]


def test_an_uncredited_user_is_not_on_the_board(
    client: TestClient, db: Session, student, other_student
) -> None:
    """No ledger, no ranking — the board lists contributors, not the register."""
    credit(db, student, 100)

    assert names(board(client, student)) == [student.name]


def test_a_ledger_that_nets_to_zero_still_ranks(
    client: TestClient, db: Session, student, other_student
) -> None:
    """Being on the board is having earned, not having a balance."""
    credit(db, other_student, 100)
    credit(db, other_student, -100)
    credit(db, student, 50)

    entries = board(client, student)

    assert [(entry["name"], entry["credits"]) for entry in entries] == [
        (student.name, 50),
        (other_student.name, 0),
    ]


def test_a_deleted_user_leaves_the_board(
    client: TestClient, db: Session, student, other_student
) -> None:
    credit(db, student, 100)
    credit(db, other_student, 500)
    other_student.deleted_at = datetime.now(UTC)
    db.flush()

    assert names(board(client, student)) == [student.name]


# --- the score ----------------------------------------------------------------------


def test_the_score_is_the_sum_of_the_ledger(client: TestClient, db: Session, student) -> None:
    credit(db, student, 120)
    credit(db, student, 80, source="Faculty Review")

    assert board(client, student)[0]["credits"] == 200


def test_a_correction_lowers_the_score(client: TestClient, db: Session, student) -> None:
    """A negative row is a real ledger line, so it is in the sum like any other."""
    credit(db, student, 300)
    credit(db, student, -40)

    assert board(client, student)[0]["credits"] == 260


def test_the_board_agrees_with_the_credit_summary(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """One economy: the leaderboard and the student's own page read the same ledger."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)

    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]
    entry = board(client, student)[0]

    assert entry["credits"] == summary["total"] == TOTAL
    assert entry["badge"] == summary["level_name"]


# --- ranking ------------------------------------------------------------------------


def test_the_board_descends_by_credits(
    client: TestClient, db: Session, institution_a, student, other_student
) -> None:
    third = make_user(db, institution=institution_a, email="dev.rao@crce.edu")
    credit(db, student, 100)
    credit(db, other_student, 300)
    credit(db, third, 200)

    entries = board(client, student)

    assert names(entries) == [other_student.name, third.name, student.name]
    assert [entry["rank"] for entry in entries] == [1, 2, 3]


def test_a_tie_shares_a_rank_and_skips_the_next(
    client: TestClient, db: Session, institution_a, student, other_student
) -> None:
    """RANK(), not ROW_NUMBER(): equal work is equal standing."""
    third = make_user(db, institution=institution_a, email="dev.rao@crce.edu")
    credit(db, student, 300)
    credit(db, other_student, 300)
    credit(db, third, 100)

    entries = board(client, student)

    assert [entry["rank"] for entry in entries] == [1, 1, 3]
    assert entries[2]["name"] == third.name


def test_ranks_are_per_role_not_across_the_institution(
    client: TestClient, db: Session, student, faculty
) -> None:
    credit(db, student, 100)
    credit(db, faculty, 900)

    assert board(client, student, "students")[0]["rank"] == 1
    assert board(client, student, "faculty")[0]["rank"] == 1


def test_contributions_do_not_move_a_rank(
    client: TestClient, db: Session, student, other_student, faculty, problem, seeded_rules
) -> None:
    """A student with a shipped project still ranks below one with more credits."""
    project_id = approved_project(client, student, faculty, problem)
    award(client, faculty, project_id)
    credit(db, other_student, TOTAL + 1)

    entries = board(client, student)

    assert names(entries) == [other_student.name, student.name]
    assert (entries[0]["contributions"], entries[1]["contributions"]) == (0, 1)


def test_a_badge_does_not_move_a_rank(
    client: TestClient, db: Session, student, other_student
) -> None:
    credit(db, student, 601)
    credit(db, other_student, 599)

    entries = board(client, student)

    assert [entry["badge"] for entry in entries] == ["Luminary", "Mastership"]
    assert [entry["rank"] for entry in entries] == [1, 2]


# --- the display columns ------------------------------------------------------------


def test_a_students_contributions_are_their_shipped_projects(
    client: TestClient, db: Session, student, faculty, problem, seeded_rules
) -> None:
    """Counted at completion — an approved-but-unawarded project has not shipped."""
    project_id = approved_project(client, student, faculty, problem)
    credit(db, student, 100)

    assert board(client, student)[0]["contributions"] == 0

    award(client, faculty, project_id)

    assert board(client, student)[0]["contributions"] == 1


def test_a_mentors_contributions_are_the_projects_they_carry(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    second = make_problem(db, institution=institution_a, author=faculty, title="Lab booking")
    approved_project(client, student, faculty, problem)
    approved_project(client, other_student, faculty, second)
    credit(db, faculty, 100)

    assert board(client, student, "faculty")[0]["contributions"] == 2


def test_the_badge_is_the_phase_5a_tier(client: TestClient, db: Session, student) -> None:
    credit(db, student, 250)

    entry = board(client, student)[0]

    assert entry["badge"] == config.level_of(250)[1] == "Builder"


def test_an_entry_carries_the_identity_the_frontend_renders(
    client: TestClient, db: Session, institution_a, student
) -> None:
    mentor = make_user(
        db, institution=institution_a, email="dr.neha.kulkarni@crce.edu", role=UserRole.FACULTY
    )
    credit(db, student, 100)
    credit(db, mentor, 100)

    entry = board(client, student)[0]
    mentor_entry = board(client, student, "faculty")[0]

    assert entry["id"] == str(student.id)
    assert entry["name"] == student.name == "Aarav Sharma"
    assert entry["avatar_initials"] == "AS"
    assert entry["role"] == UserRole.STUDENT.value
    assert mentor_entry["avatar_initials"] == "NK"
    assert mentor_entry["role"] == UserRole.FACULTY.value


def test_rank_movement_is_not_tracked_in_v1(client: TestClient, db: Session, student) -> None:
    """No snapshot table, no scheduler — so there is no movement to report."""
    credit(db, student, 100)

    assert board(client, student)[0]["rank_change"] == 0


def test_department_is_absent_until_users_carry_one(
    client: TestClient, db: Session, student
) -> None:
    """`users` has no department column; the board reports null rather than invent one."""
    credit(db, student, 100)

    assert board(client, student)[0]["department"] is None


# --- the board writes nothing -------------------------------------------------------


def test_reading_the_board_records_no_audit(client: TestClient, db: Session, student) -> None:
    """A read of a read model is not an event. Only the login before it is audited."""
    credit(db, student, 100)
    # Logged in first: the audit line that follows belongs to authentication.
    headers = auth_header(client, student.email)
    before = db.query(AuditLog).count()

    client.get("/api/v1/leaderboard/students", headers=headers)
    client.get("/api/v1/leaderboard/faculty", headers=headers)

    assert db.query(AuditLog).count() == before
