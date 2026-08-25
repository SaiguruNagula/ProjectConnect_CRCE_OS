"""Phase 12 — the audit read model.

Phase 12 writes no audit rows. `common/audit.record_audit` has been recording
them since the foundation, from inside the modules that own the actions, and
these tests only prove that reading them back is safe: the right roles, the
caller's own institution, no secrets, and no way to write one over HTTP.

The split between the two feeds is deliberate and is asserted here. Sign-in
history is an admin surface; what the institution built is a staff surface.
Nothing below asserts on ordering, because rows written inside one test share a
transaction timestamp.
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.audit import AuditLog, record_audit
from app.common.enums import UserRole
from app.modules.audit.repository import FEED_LIMIT
from tests.conftest import auth_header, make_user
from tests.test_suggestions import create_suggestion
from tests.test_teams import create_team

ACTIVITY = "/api/v1/audit/activity"
IDENTITY = "/api/v1/audit/users"


def read(client: TestClient, user, path: str):
    return client.get(path, headers=auth_header(client, user.email))


def actions(client: TestClient, user, path: str) -> list[str]:
    response = read(client, user, path)
    assert response.status_code == 200, response.text
    return [row["action"] for row in response.json()["data"]]


def admin_of(db: Session, institution, email: str = "priya.nair@crce.edu"):
    return make_user(db, institution=institution, email=email, role=UserRole.ADMIN)


def principal_of(db: Session, institution, email: str = "sunil.joshi@crce.edu"):
    return make_user(db, institution=institution, email=email, role=UserRole.PRINCIPAL)


# --- authorization ----------------------------------------------------------------


def test_the_audit_log_is_closed_to_anonymous_callers(client: TestClient) -> None:
    for path in (ACTIVITY, IDENTITY):
        response = client.get(path)
        assert response.status_code == 401, response.text
        assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_students_read_neither_feed(client: TestClient, db: Session, student) -> None:
    """A student sees their own work through the modules that own it."""
    for path in (ACTIVITY, IDENTITY):
        response = read(client, student, path)
        assert response.status_code == 403, response.text
        assert response.json()["error_code"] == "FORBIDDEN"


def test_staff_read_activity_but_only_an_admin_reads_identity(
    client: TestClient, db: Session, faculty, institution_a
) -> None:
    principal = principal_of(db, institution_a)
    admin = admin_of(db, institution_a)

    for staff in (faculty, principal, admin):
        assert read(client, staff, ACTIVITY).status_code == 200

    assert read(client, faculty, IDENTITY).status_code == 403
    assert read(client, principal, IDENTITY).status_code == 403
    assert read(client, admin, IDENTITY).status_code == 200


def test_the_audit_log_is_read_only_over_http(
    client: TestClient, db: Session, institution_a
) -> None:
    """Nothing forges an actor because nothing accepts one."""
    admin = admin_of(db, institution_a)
    headers = auth_header(client, admin.email)
    forged = {"action": "credit.awarded", "entity": "project", "actor_id": str(admin.id)}

    for path in (ACTIVITY, IDENTITY):
        assert client.post(path, json=forged, headers=headers).status_code == 405
        assert client.delete(path, headers=headers).status_code == 405


# --- what each feed contains ------------------------------------------------------


def test_activity_carries_business_actions_and_not_sign_ins(
    client: TestClient, db: Session, student, faculty, problem, institution_a
) -> None:
    create_team(client, student, problem)

    listed = actions(client, faculty, ACTIVITY)

    assert "team.created" in listed
    assert not any(action.startswith(("login.", "logout", "token.")) for action in listed)


def test_identity_carries_sign_ins_and_not_business_actions(
    client: TestClient, db: Session, student, problem, institution_a
) -> None:
    admin = admin_of(db, institution_a)
    create_team(client, student, problem)

    listed = actions(client, admin, IDENTITY)

    assert "login.succeeded" in listed
    assert "team.created" not in listed


def test_a_failed_sign_in_is_visible_to_the_admin(
    client: TestClient, db: Session, student, institution_a
) -> None:
    admin = admin_of(db, institution_a)

    refused = client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": "not-the-password"}
    )

    assert refused.status_code == 401
    assert "login.failed" in actions(client, admin, IDENTITY)


def test_an_entry_names_the_actor_and_carries_no_metadata(
    client: TestClient, db: Session, student, faculty
) -> None:
    """`meta` holds identifiers and outcomes for operators. It does not travel."""
    create_suggestion(client, student, faculty, submit=True)

    entries = read(client, faculty, ACTIVITY).json()["data"]
    submitted = [row for row in entries if row["action"] == "suggestion.submitted"]

    assert len(submitted) == 1
    assert submitted[0]["actor_name"] == student.name
    assert set(submitted[0]) == {
        "id",
        "action",
        "entity",
        "entity_id",
        "actor_name",
        "created_at",
    }


def test_no_credential_ever_reaches_the_feed(
    client: TestClient, db: Session, student, institution_a
) -> None:
    admin = admin_of(db, institution_a)
    client.post(
        "/api/v1/auth/login", json={"email": student.email, "password": "hunter2-is-a-secret"}
    )

    body = read(client, admin, IDENTITY).text

    assert "hunter2-is-a-secret" not in body
    assert "password" not in body.lower()
    assert student.password_hash not in body


# --- tenancy ----------------------------------------------------------------------


def test_the_feeds_show_only_the_callers_own_institution(
    client: TestClient, db: Session, student, problem, institution_a, institution_b
) -> None:
    """The institution comes from the token, so there is nothing to pass."""
    admin = admin_of(db, institution_a)
    their_faculty = make_user(
        db, institution=institution_b, email="anita.rao@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(db, institution=institution_b, email="dev.mehta@other.edu")
    create_suggestion(client, their_student, their_faculty, submit=True)
    create_team(client, student, problem)

    for path in (ACTIVITY, IDENTITY):
        entries = read(client, admin, path).json()["data"]
        assert entries
        assert their_student.name not in {row["actor_name"] for row in entries}
        assert their_faculty.name not in {row["actor_name"] for row in entries}


def test_a_query_parameter_cannot_choose_the_institution(
    client: TestClient, db: Session, student, problem, institution_a, institution_b
) -> None:
    admin = admin_of(db, institution_a)
    their_faculty = make_user(
        db, institution=institution_b, email="anita.rao@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(db, institution=institution_b, email="dev.mehta@other.edu")
    create_suggestion(client, their_student, their_faculty, submit=True)
    create_team(client, student, problem)

    spoofed = client.get(
        ACTIVITY,
        params={"institution_id": str(institution_b.id)},
        headers=auth_header(client, admin.email),
    )

    assert spoofed.status_code == 200, spoofed.text
    named = {row["actor_name"] for row in spoofed.json()["data"]}
    assert named == {student.name}


# --- shape ------------------------------------------------------------------------


def test_the_feed_is_capped(client: TestClient, db: Session, institution_a) -> None:
    """A panel, not an archive. The rows stay in the table either way."""
    admin = admin_of(db, institution_a)
    for index in range(FEED_LIMIT + 5):
        record_audit(
            db,
            action="project.published",
            entity="project",
            entity_id=str(index),
            actor_id=admin.id,
            institution_id=institution_a.id,
        )
    db.commit()

    listed = actions(client, admin, ACTIVITY)

    assert len(listed) == FEED_LIMIT
    assert db.query(AuditLog).filter_by(action="project.published").count() == FEED_LIMIT + 5


def test_an_empty_institution_returns_an_empty_feed(
    client: TestClient, db: Session, institution_b
) -> None:
    """No fabricated history for a college that has not done anything yet."""
    admin = admin_of(db, institution_b, email="meera.iyer@other.edu")

    activity = read(client, admin, ACTIVITY)

    assert activity.status_code == 200, activity.text
    assert activity.json()["data"] == []
