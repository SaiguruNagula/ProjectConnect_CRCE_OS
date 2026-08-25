"""Institution self-service and the public campus aggregate (Phase 14, ADR-9).

What is *not* here: the tenancy boundary. Twenty-four files already prove that
one institution cannot read or write another, and re-proving it would only make
the suite slower. This file guards the three surfaces Phase 14 actually added,
and the two claims that are specific to them:

1. The console's directory is the caller's own institution and cannot be widened
   into a platform view — no parameter, no second row, no cross-tenant count.
2. The public aggregate is counts and nothing else. It is the only anonymous
   route in the product that touches academic data, so what it can say is
   asserted against the response body itself, not against the schema.

Expected figures are read back from the modules that own them
(`users_repo`, `projects_repo`, `credits_repo`) rather than written as literals,
so a change to the Credit Engine's arithmetic moves the assertion with it.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import InstitutionStatus, UserRole
from app.modules.credits import repository as credits_repo
from app.modules.institutions import repository as institutions_repo
from app.modules.projects import repository as projects_repo
from app.modules.users import repository as users_repo
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import approved_project, award
from tests.test_credits import seeded_rules as _seeded_rules

seeded_rules = _seeded_rules

DIRECTORY = "/api/v1/institutions"
UPDATE = "/api/v1/institutions/me"
CAMPUS_IMPACT = "/api/v1/analytics/campus-impact"

# The names repositories/api/admin.repository.ts reads off a directory row.
ROW_FIELDS = {
    "id",
    "name",
    "full_name",
    "code",
    "type",
    "city",
    "state",
    "website",
    "support_email",
    "address",
    "status",
    "tier",
    "principal",
    "students",
    "faculty",
    "projects",
    "credits",
}

# The console is admin-exclusive, so a principal is as unauthorized as a student.
OTHER_ROLES = [UserRole.STUDENT, UserRole.FACULTY, UserRole.PRINCIPAL]

# A complete, valid edit. Every key exists on `institutions`; none of them is
# an identifier, a status or a tier.
EDIT = {
    "name": "CRCE",
    "full_name": "Fr. Conceicao Rodrigues College of Engineering",
    "code": "IN-MUM-01",
    "type": "Engineering",
    "city": "Mumbai",
    "state": "Maharashtra",
    "website": "crce.edu.in",
    "support_email": "admin@crce.edu.in",
    "address": "Bandstand, Bandra (W), Mumbai",
    "principal_name": "Dr. Srija Unnikrishnan",
    "principal_email": "principal@crce.edu.in",
}


@pytest.fixture
def admin(db: Session, institution_a):
    return make_user(
        db, institution=institution_a, email="rohan.mehta@crce.edu", role=UserRole.ADMIN
    )


def directory(client: TestClient, admin, **params):
    return client.get(DIRECTORY, params=params, headers=auth_header(client, admin.email))


def patch(client: TestClient, admin, body: dict):
    return client.patch(UPDATE, json=body, headers=auth_header(client, admin.email))


# --- who may use the console -------------------------------------------------------


def test_the_directory_refuses_an_anonymous_caller(client: TestClient) -> None:
    assert client.get(DIRECTORY).status_code == 401


def test_the_update_refuses_an_anonymous_caller(client: TestClient) -> None:
    assert client.patch(UPDATE, json=EDIT).status_code == 401


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_no_role_but_admin_reads_the_directory(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    intruder = make_user(
        db, institution=institution_a, email=f"{role.value}@crce.edu", role=role
    )
    assert directory(client, intruder).status_code == 403


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_no_role_but_admin_edits_the_institution(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    intruder = make_user(
        db, institution=institution_a, email=f"{role.value}@crce.edu", role=role
    )
    assert patch(client, intruder, EDIT).status_code == 403


# --- the directory is one institution: the caller's own ----------------------------


def test_the_directory_is_the_admins_own_institution(
    client: TestClient, admin, institution_a
) -> None:
    response = directory(client, admin)
    assert response.status_code == 200, response.text

    rows = response.json()["data"]
    assert len(rows) == 1
    assert rows[0]["id"] == str(institution_a.id)
    assert set(rows[0]) == ROW_FIELDS


def test_a_second_institution_never_joins_the_directory(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    """ADR-9 gives a deployment one institution; a second row is still invisible."""
    make_user(db, institution=institution_b, email="dean@other.edu", role=UserRole.ADMIN)

    rows = directory(client, admin).json()["data"]

    assert [row["id"] for row in rows] == [str(admin.institution_id)]


def test_an_institution_id_parameter_cannot_widen_the_directory(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    """The scope is the token's. A parameter naming another tenant is inert."""
    make_user(db, institution=institution_b, email="dean@other.edu", role=UserRole.ADMIN)

    for params in (
        {"institution_id": str(institution_b.id)},
        {"institution": str(institution_b.id)},
        {"id": str(institution_b.id)},
    ):
        rows = directory(client, admin, **params).json()["data"]
        assert [row["id"] for row in rows] == [str(admin.institution_id)], params


def test_the_row_carries_the_owning_modules_counts(
    client: TestClient, db: Session, admin, student, faculty, problem, seeded_rules
) -> None:
    """Every count is the canonical accessor's, not a number this module made."""
    award(client, faculty, approved_project(client, student, faculty, problem))
    institution_id = admin.institution_id

    row = directory(client, admin).json()["data"][0]

    by_role = users_repo.counts_by_role(db, institution_id)
    active, completed = projects_repo.counts_by_completion(db, institution_id)
    assert row["students"] == by_role.get(UserRole.STUDENT, 0)
    assert row["faculty"] == by_role.get(UserRole.FACULTY, 0)
    assert row["projects"] == active + completed
    assert row["credits"] == credits_repo.institution_total(db, institution_id)
    # A guard on the guard: an institution with no activity would pass the four
    # equalities above while proving nothing.
    assert row["credits"] > 0


def test_another_institutions_activity_is_not_counted_into_the_row(
    client: TestClient, db: Session, admin, institution_b, seeded_rules
) -> None:
    their_faculty = make_user(
        db, institution=institution_b, email="mentor@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(db, institution=institution_b, email="builder@other.edu")
    their_problem = make_problem(db, institution=institution_b, author=their_faculty)
    their_project = approved_project(client, their_student, their_faculty, their_problem)
    award(client, their_faculty, their_project)

    row = directory(client, admin).json()["data"][0]

    assert row["students"] == 0
    assert row["faculty"] == 0
    assert row["projects"] == 0
    assert row["credits"] == 0


def test_a_principal_is_reported_only_when_the_institution_names_one(
    client: TestClient, admin
) -> None:
    """`principal` is null until both a name and an address exist."""
    assert directory(client, admin).json()["data"][0]["principal"] is None

    patch(client, admin, EDIT)

    principal = directory(client, admin).json()["data"][0]["principal"]
    assert principal == {
        "name": EDIT["principal_name"],
        "email": EDIT["principal_email"],
        "verified": False,
    }


# --- editing the caller's own institution ------------------------------------------


def test_an_admin_edits_their_own_institution(
    client: TestClient, db: Session, admin, institution_a
) -> None:
    response = patch(client, admin, EDIT)
    assert response.status_code == 200, response.text

    row = response.json()["data"]
    assert row["id"] == str(institution_a.id)
    # The two principal fields answer nested, under `principal` — see
    # test_a_principal_is_reported_only_when_the_institution_names_one.
    for field, value in EDIT.items():
        if field.startswith("principal_"):
            continue
        assert row[field] == value, field

    db.refresh(institution_a)
    assert institution_a.full_name == EDIT["full_name"]
    assert institution_a.city == EDIT["city"]
    # Read back through the route as well: the response must not be the only
    # place the new values exist.
    assert directory(client, admin).json()["data"][0]["full_name"] == EDIT["full_name"]


def test_the_update_ignores_identity_status_and_tier(
    client: TestClient, db: Session, admin, institution_a, institution_b
) -> None:
    """The fields that would move a tenant, unlock a login or grant a licence.

    `status` is the one that matters most: ADR-9 makes it the authentication
    gate, so an institution admin who could set it could suspend the deployment
    they administer.
    """
    before = (institution_a.id, institution_a.status, institution_a.tier)

    response = patch(
        client,
        admin,
        EDIT
        | {
            "id": str(institution_b.id),
            "institution_id": str(institution_b.id),
            "status": "suspended",
            "tier": "PLATFORM_OPERATOR",
            "principal_verified": True,
        },
    )
    assert response.status_code == 200, response.text

    db.refresh(institution_a)
    assert (institution_a.id, institution_a.status, institution_a.tier) == before
    assert institution_a.principal_verified is False
    # The other institution was named in the body and was not touched by it.
    db.refresh(institution_b)
    assert institution_b.name != EDIT["name"]
    assert institution_b.status is InstitutionStatus.ACTIVE


def test_an_admin_edits_no_institution_but_their_own(
    client: TestClient, db: Session, institution_a, institution_b
) -> None:
    their_admin = make_user(
        db, institution=institution_b, email="dean@other.edu", role=UserRole.ADMIN
    )
    before = institution_a.full_name

    assert patch(client, their_admin, EDIT).status_code == 200

    db.refresh(institution_a)
    db.refresh(institution_b)
    assert institution_a.full_name == before
    assert institution_b.full_name == EDIT["full_name"]


def test_naming_a_new_principal_clears_the_verified_flag(
    client: TestClient, db: Session, admin, institution_a
) -> None:
    """Nothing verifies an identity yet, so the flag may only ever fall."""
    institution_a.principal_verified = True
    institution_a.principal_email = "old.principal@crce.edu"
    db.flush()

    patch(client, admin, EDIT)

    db.refresh(institution_a)
    assert institution_a.principal_email == EDIT["principal_email"]
    assert institution_a.principal_verified is False


def test_a_code_another_institution_holds_is_rejected(
    client: TestClient, db: Session, admin, institution_b
) -> None:
    response = patch(client, admin, EDIT | {"code": institution_b.code})

    assert response.status_code == 409, response.text
    assert institutions_repo.get_by_code(db, institution_b.code).id == institution_b.id


def test_keeping_the_current_code_is_not_a_conflict(
    client: TestClient, admin, institution_a
) -> None:
    assert patch(client, admin, EDIT | {"code": institution_a.code}).status_code == 200


def test_an_empty_required_field_is_rejected(client: TestClient, admin) -> None:
    assert patch(client, admin, EDIT | {"name": "  "}).status_code == 422


# --- the public campus aggregate ---------------------------------------------------


def test_campus_impact_is_readable_without_a_token(client: TestClient, institution_a) -> None:
    response = client.get(CAMPUS_IMPACT)

    assert response.status_code == 200, response.text
    assert [metric["label"] for metric in response.json()["data"]] == [
        "Students",
        "Faculty Mentors",
        "Projects Built",
        "Credits Earned",
    ]


def test_campus_impact_carries_counts_and_nothing_else(
    client: TestClient, db: Session, student, faculty, problem, admin, seeded_rules
) -> None:
    """The privacy assertion, made against the body rather than the schema."""
    award(client, faculty, approved_project(client, student, faculty, problem))
    patch(client, admin, EDIT)

    body = client.get(CAMPUS_IMPACT).json()["data"]

    assert all(set(metric) == {"label", "value"} for metric in body)
    assert all(isinstance(metric["value"], int) for metric in body)

    # Nothing identifying anybody survives into the payload. Checked as text so
    # a value nested somewhere unexpected would still be caught.
    payload = json.dumps(body)
    for secret in (
        student.name,
        student.email,
        faculty.name,
        faculty.email,
        admin.email,
        problem.title,
        problem.department,
        EDIT["principal_name"],
        EDIT["principal_email"],
        EDIT["address"],
        EDIT["code"],
    ):
        assert secret not in payload, secret


def test_campus_impact_counts_what_the_owning_modules_count(
    client: TestClient, db: Session, student, faculty, problem, institution_a, seeded_rules
) -> None:
    award(client, faculty, approved_project(client, student, faculty, problem))

    figures = {m["label"]: m["value"] for m in client.get(CAMPUS_IMPACT).json()["data"]}

    by_role = users_repo.counts_by_role(db, institution_a.id)
    _, completed = projects_repo.counts_by_completion(db, institution_a.id)
    assert figures["Students"] == by_role.get(UserRole.STUDENT, 0)
    assert figures["Faculty Mentors"] == by_role.get(UserRole.FACULTY, 0)
    assert figures["Projects Built"] == completed
    assert figures["Credits Earned"] == credits_repo.institution_total(db, institution_a.id)
    assert completed == 1


def test_campus_impact_excludes_an_institution_that_is_not_active(
    client: TestClient, db: Session, institution_a, institution_b
) -> None:
    """A PENDING or SUSPENDED institution cannot authenticate and is not counted."""
    make_user(db, institution=institution_a, email="counted@crce.edu")
    make_user(db, institution=institution_b, email="hidden@other.edu")
    institution_b.status = InstitutionStatus.PENDING
    db.flush()

    figures = {m["label"]: m["value"] for m in client.get(CAMPUS_IMPACT).json()["data"]}

    assert figures["Students"] == 1


def test_campus_impact_is_empty_when_no_institution_is_active(
    client: TestClient, db: Session, institution_a
) -> None:
    """Nothing to report rather than a row of zeros; the bar hides itself."""
    institution_a.status = InstitutionStatus.SUSPENDED
    db.flush()

    assert client.get(CAMPUS_IMPACT).json()["data"] == []
