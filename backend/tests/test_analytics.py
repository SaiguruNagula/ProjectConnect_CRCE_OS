"""Institution analytics: departments, monthly throughput, review turnaround (Phase 13).

The three sections this file covers ride on the principal dashboard, so the
boundary tests in test_principal.py already guard them; what is asserted here is
that the numbers inside are the owning modules' own. A department's credits are
checked against the ledger the mentor can see in their own history, its review
counts against the Review Engine's queues, its project split against the
institution counters. The one thing this file does assert outright is history:
rows are written with timestamps from earlier months and the series is required
to put them in those months, because a growth chart that could not tell last
month from this one would be a shape rather than a record.

Nothing below hardcodes a business total. `TOTAL` is the sum of the award
components the test itself submits, not a rule the platform owns.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, UserRole
from app.modules.credits import config
from app.modules.credits.models import CreditTransaction
from app.modules.dashboard.service import GROWTH_MONTHS
from app.modules.projects.models import Project
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import TOTAL, approved_project, award
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_principal import dashboard
from tests.test_principal import principal as _principal
from tests.test_projects import open_project
from tests.test_reviews import FEEDBACK, decide, pending_idea, submit

seeded_rules = _seeded_rules
principal = _principal

# The `problem` fixture's department, and a second one to prove that a project's
# department is the problem's rather than anybody's personal one.
COMPUTER = "Computer Engineering"
MECHANICAL = "Mechanical Engineering"

# Every role the analytics sections are closed to — the same gate Phase 11 put
# on the endpoint, re-asserted because Phase 13 put institution-wide breakdowns
# behind it.
OTHER_ROLES = [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN]


@pytest.fixture
def mechanical(db: Session, institution_a, faculty):
    """A second department, published by the same faculty member.

    Authored by the Computer Engineering faculty deliberately: if the breakdown
    ever attributed a project to its mentor's department instead of its
    problem's, every test using this fixture would land in the wrong row.
    """
    return make_problem(
        db,
        institution=institution_a,
        author=faculty,
        title="Retrofit Lathe Vibration Monitor",
        department=MECHANICAL,
    )


def departments(counters: dict) -> dict[str, dict]:
    return {row["name"]: row for row in counters["departments"]}


def history(client: TestClient, user) -> list[dict]:
    response = client.get("/api/v1/credits/history", headers=auth_header(client, user.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def month_start(now: datetime, *, back: int) -> datetime:
    """The first of the month `back` months before `now`, in UTC."""
    start = now.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for _ in range(back):
        start = (start - timedelta(days=1)).replace(day=1)
    return start


def label(start: datetime) -> str:
    return f"{start.year:04d}-{start.month:02d}"


# --- who may read the breakdown ----------------------------------------------------


@pytest.mark.parametrize("role", OTHER_ROLES)
def test_the_breakdown_is_behind_the_same_gate_as_the_counters(
    client: TestClient, db: Session, institution_a, role: UserRole
) -> None:
    intruder = make_user(
        db, institution=institution_a, email=f"analytics-{role.value}@crce.edu", role=role
    )

    response = client.get(
        "/api/v1/dashboard/principal", headers=auth_header(client, intruder.email)
    )

    # A department table is the institution seen from above; a faculty member
    # reading it would see every other department's backlog.
    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"


def test_the_breakdown_is_closed_to_anonymous_callers(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/principal")

    assert response.status_code == 401
    assert response.json()["error_code"] == "UNAUTHENTICATED"


# --- a project's department is its problem's ---------------------------------------


def test_the_departments_are_the_ones_problems_were_published_under(
    client: TestClient, principal, problem, mechanical
) -> None:
    rows = departments(dashboard(client, principal))

    # Two problems, two departments, no projects yet. The list is the problems
    # module's, so a department that has published nothing is simply not in it.
    assert set(rows) == {COMPUTER, MECHANICAL}


def test_a_department_with_no_projects_is_a_row_of_zeros(
    client: TestClient, principal, problem
) -> None:
    row = departments(dashboard(client, principal))[COMPUTER]

    # Present and empty, not omitted: the department exists, and a table that
    # dropped it would suggest the institution has no such department.
    assert row == {
        "name": COMPUTER,
        "active_projects": 0,
        "completed_projects": 0,
        "pending_reviews": 0,
        "decided_reviews": 0,
        "approved_reviews": 0,
        "credits": 0,
    }


def test_a_project_counts_under_its_problems_department(
    client: TestClient, principal, student, other_student, faculty, problem, mechanical
) -> None:
    open_project(client, student, problem)
    open_project(client, other_student, mechanical)

    rows = departments(dashboard(client, principal))

    # The mechanical problem was written by the computer-engineering faculty and
    # applied to by a student whose own department is unset. It still lands under
    # Mechanical, because the problem is what carries the department.
    assert rows[COMPUTER]["active_projects"] == 1
    assert rows[MECHANICAL]["active_projects"] == 1


def test_the_department_split_totals_the_institution_counters(
    client: TestClient,
    principal,
    student,
    other_student,
    faculty,
    problem,
    mechanical,
    seeded_rules,
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    open_project(client, other_student, mechanical)

    counters = dashboard(client, principal)

    # Every live project is in exactly one department, so the breakdown is a
    # partition of the two counters above it rather than a second count.
    assert sum(row["active_projects"] for row in counters["departments"]) == counters[
        "active_projects"
    ]
    assert sum(row["completed_projects"] for row in counters["departments"]) == counters[
        "completed_projects"
    ]


def test_a_project_changes_column_when_the_credit_engine_completes_it(
    client: TestClient, principal, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    before = departments(dashboard(client, principal))[COMPUTER]
    assert (before["active_projects"], before["completed_projects"]) == (1, 0)

    assert award(client, faculty, project_id).status_code == 200

    after = departments(dashboard(client, principal))[COMPUTER]
    # The same `completed_at` the institution counters split on. The department
    # table does not decide what finished means; it inherits the decision.
    assert (after["active_projects"], after["completed_projects"]) == (0, 1)


# --- the credits a department's projects paid out ----------------------------------


def test_a_departments_credits_are_the_ledger_rows_its_awards_wrote(
    client: TestClient, principal, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    mentorship = sum(
        row["points"]
        for row in history(client, faculty)
        if row["source"] == config.SOURCE_MENTORSHIP
    )

    # What the award paid the team, plus what the mentor's own credit history
    # says it paid them. Both sides read the same ledger; neither is a rate this
    # test knows.
    assert mentorship > 0
    assert departments(dashboard(client, principal))[COMPUTER]["credits"] == TOTAL + mentorship


def test_rule_priced_credits_are_not_charged_to_any_department(
    client: TestClient, principal, student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    counters = dashboard(client, principal)
    charged = sum(row["credits"] for row in counters["departments"])

    # Reviewing and publishing earn credits that name no project, so the
    # institution has earned more than its projects paid out. The two figures
    # answer different questions and are meant to differ.
    assert 0 < charged < counters["total_credits"]


# --- what the Review Engine is waiting on ------------------------------------------


def test_pending_reviews_are_the_ones_the_review_engine_still_queues(
    client: TestClient, principal, student, other_student, faculty, problem, mechanical
) -> None:
    pending_idea(client, student, problem)
    pending_idea(client, other_student, mechanical)

    counters = dashboard(client, principal)
    queues = client.get(
        "/api/v1/reviews/queues", headers=auth_header(client, faculty.email)
    ).json()["data"]

    queued = sum(len(queues[stage]) for stage in ("idea", "poc", "final"))
    assert queued == 2
    assert sum(row["pending_reviews"] for row in counters["departments"]) == queued
    # Nothing has been decided, and a stage cannot be both.
    assert all(row["decided_reviews"] == 0 for row in counters["departments"])


def test_a_verdict_moves_a_stage_from_pending_to_decided(
    client: TestClient, principal, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    assert departments(dashboard(client, principal))[COMPUTER]["pending_reviews"] == 1

    assert decide(client, faculty, project_id, SubmissionStage.IDEA, "approve").status_code == 200

    row = departments(dashboard(client, principal))[COMPUTER]
    assert (row["pending_reviews"], row["decided_reviews"], row["approved_reviews"]) == (0, 1, 1)


def test_a_rejected_stage_is_decided_but_not_approved(
    client: TestClient, principal, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)

    response = decide(client, faculty, project_id, SubmissionStage.IDEA, "reject", **FEEDBACK)
    assert response.status_code == 200

    row = departments(dashboard(client, principal))[COMPUTER]
    # A success rate the frontend draws from these two is the share of decided
    # stages that were approved — which is why a rejection has to land in one
    # column and not the other.
    assert (row["decided_reviews"], row["approved_reviews"]) == (1, 0)


# --- how long a verdict takes ------------------------------------------------------


def test_there_is_no_turnaround_until_something_has_been_reviewed(
    client: TestClient, principal, student, problem
) -> None:
    pending_idea(client, student, problem)

    # Null, not zero: nothing has been decided, and zero would report an instant
    # turnaround the institution never achieved.
    assert dashboard(client, principal)["avg_review_days"] is None


def test_a_decided_stage_reports_the_time_it_actually_waited(
    client: TestClient, principal, student, faculty, problem
) -> None:
    project_id = pending_idea(client, student, problem)
    assert decide(client, faculty, project_id, SubmissionStage.IDEA, "approve").status_code == 200

    days = dashboard(client, principal)["avg_review_days"]

    # Submitted and decided within the same test, so the mean is a fraction of a
    # day — measured from the two timestamps the Review Engine wrote, not
    # estimated from anything.
    assert days is not None
    assert 0 <= days < 1


# --- six months of real history ----------------------------------------------------


def test_there_is_no_series_until_something_has_happened(
    client: TestClient, db: Session, institution_b
) -> None:
    lone_principal = make_user(
        db, institution=institution_b, email="quiet@other.edu", role=UserRole.PRINCIPAL
    )

    # Empty rather than six zeroed months: the institution has no history, and a
    # flat line would assert half a year it has not been here for.
    assert dashboard(client, lone_principal)["growth"] == []


def test_the_window_is_six_months_ending_with_this_one(
    client: TestClient, principal, student, problem
) -> None:
    open_project(client, student, problem)

    growth = dashboard(client, principal)["growth"]

    assert len(growth) == GROWTH_MONTHS
    now = datetime.now(UTC)
    assert [point["month"] for point in growth] == [
        label(month_start(now, back=back)) for back in reversed(range(GROWTH_MONTHS))
    ]


def test_this_months_row_counts_what_happened_this_month(
    client: TestClient, principal, student, other_student, faculty, problem, seeded_rules
) -> None:
    project_id = approved_project(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200
    open_project(client, other_student, problem)

    counters = dashboard(client, principal)
    latest = counters["growth"][-1]

    assert latest["projects"] == 2
    # Everything this institution has ever earned was posted today, so the last
    # bar and the institution total are the same sum read two ways.
    assert latest["credits"] == counters["total_credits"]
    assert all(point["credits"] == 0 for point in counters["growth"][:-1])


def test_an_older_ledger_row_is_counted_in_the_month_it_was_written(
    client: TestClient, db: Session, principal, student, institution_a, problem
) -> None:
    two_months_back = month_start(datetime.now(UTC), back=2)
    db.add(
        CreditTransaction(
            institution_id=institution_a.id,
            user_id=student.id,
            source=config.SOURCE_PROJECT_COMPLETION,
            source_id=uuid.uuid4(),
            points=120,
            description="Awarded before this term.",
            created_at=two_months_back + timedelta(days=3),
        )
    )
    db.flush()

    growth = {point["month"]: point for point in dashboard(client, principal)["growth"]}

    # The proof that the series is history and not a projection: the row carries
    # the month it was posted in, and it is counted there and nowhere else.
    assert growth[label(two_months_back)]["credits"] == 120
    assert growth[label(month_start(datetime.now(UTC), back=0))]["credits"] == 0


def test_an_older_project_is_counted_in_the_month_it_started(
    client: TestClient, db: Session, principal, student, faculty, problem
) -> None:
    project_id = open_project(client, student, problem)
    started = month_start(datetime.now(UTC), back=3) + timedelta(days=5)
    db.query(Project).filter_by(id=uuid.UUID(project_id)).update({"created_at": started})
    db.flush()

    growth = {point["month"]: point for point in dashboard(client, principal)["growth"]}

    assert growth[label(month_start(datetime.now(UTC), back=3))]["projects"] == 1
    assert growth[label(month_start(datetime.now(UTC), back=0))]["projects"] == 0


# --- one institution, and it is the token's ----------------------------------------


def test_another_colleges_departments_are_not_in_the_table(
    client: TestClient, db: Session, principal, institution_b, problem
) -> None:
    outsider = make_user(db, institution=institution_b, email="dean@other.edu")
    make_problem(
        db,
        institution=institution_b,
        author=outsider,
        title="Their Hydraulics Rig",
        department=MECHANICAL,
    )

    rows = departments(dashboard(client, principal))

    # The other college has a Mechanical department; this one does not, and the
    # scope is the token's institution rather than the platform's department list.
    assert set(rows) == {COMPUTER}


def test_a_query_parameter_cannot_choose_whose_departments_these_are(
    client: TestClient, db: Session, principal, institution_b, student, problem
) -> None:
    outsider = make_user(db, institution=institution_b, email="head@other.edu")
    their_problem = make_problem(
        db,
        institution=institution_b,
        author=outsider,
        title="Their Kiln Controller",
        department=MECHANICAL,
    )
    open_project(client, outsider, their_problem)
    open_project(client, student, problem)

    named = dashboard(
        client,
        principal,
        institution_id=str(institution_b.id),
        principal_id=str(uuid.uuid4()),
    )

    # Naming the other institution changes nothing, because there is no
    # parameter to name it with: the scope is read off the token.
    assert named == dashboard(client, principal)
    assert [row["name"] for row in named["departments"]] == [COMPUTER]
    assert named["departments"][0]["active_projects"] == 1


def test_a_submission_in_another_college_is_not_in_this_ones_queue_count(
    client: TestClient, db: Session, principal, institution_b, problem
) -> None:
    their_faculty = make_user(
        db, institution=institution_b, email="mentor@other.edu", role=UserRole.FACULTY
    )
    their_student = make_user(db, institution=institution_b, email="builder@other.edu")
    their_problem = make_problem(
        db, institution=institution_b, author=their_faculty, title="Their Problem"
    )
    project_id = open_project(client, their_student, their_problem)
    submit(client, their_student, project_id, SubmissionStage.IDEA)

    counters = dashboard(client, principal)

    # Same department name in both institutions, and the join still stops at the
    # tenant: the stage belongs to a project the other college owns.
    assert departments(counters)[COMPUTER]["pending_reviews"] == 0
    assert counters["avg_review_days"] is None
