"""The queries the dashboard owns.

Everything on the Student Dashboard is already counted by the module that owns
it, and the service calls that module. Only "how many of this student's stage
submissions came back with changes requested" has no existing caller, so it
lives here — a read, over tables another module owns, using that module's own
membership predicate rather than a second definition of it.

Phase 13 added four more of the same kind. A department breakdown and a monthly
series are questions no single module can answer, because both cut across two:
a project's department is its *problem's* department, and a month of throughput
is projects and ledger rows counted side by side. None of them decides
anything — every predicate below (deleted, completed, pending, decided) is the
owning module's, imported rather than restated — they only group rows the
owners already wrote.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Row, func, select
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStatus
from app.modules.problems.models import Problem
from app.modules.projects import repository as projects_repo
from app.modules.projects.models import Project, StageSubmission


def changes_requested_submissions(
    db: Session, *, institution_id: uuid.UUID, student_id: uuid.UUID
) -> int:
    """Stages a reviewer sent back, on projects this student belongs to.

    `belongs_to_student` is the projects module's own answer to "is this
    student on this project", team or solo. Re-deriving it here would be a
    second membership rule waiting to disagree with the first.
    """
    stmt = (
        select(func.count(StageSubmission.id))
        .join(Project, Project.id == StageSubmission.project_id)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            projects_repo.belongs_to_student(student_id),
            StageSubmission.status == SubmissionStatus.CHANGES_REQUESTED,
        )
    )
    return int(db.execute(stmt).scalar_one())


# --- Phase 13: the institution, cut by department and by month ----------------------


def department_projects(
    db: Session, *, institution_id: uuid.UUID
) -> Sequence[Row[tuple[uuid.UUID, str, bool]]]:
    """Every live project in the institution as (id, department, completed).

    A project has no department of its own; it inherits the one the problem was
    published under, which is a required column on `problems` and the same
    field the catalog filters by. That is the institution's only attribution
    rule, so nothing here invents a second one — a project's department is its
    problem's, whoever ends up on the team.

    Returned per project rather than pre-grouped because the caller also has to
    price each project through the Credit Engine, which answers by project.
    """
    stmt = (
        select(
            Project.id,
            Problem.department,
            Project.completed_at.is_not(None).label("completed"),
        )
        .join(Problem, Problem.id == Project.problem_id)
        .where(Project.institution_id == institution_id, Project.deleted_at.is_(None))
    )
    return list(db.execute(stmt).all())


def submission_statuses_by_department(
    db: Session, *, institution_id: uuid.UUID
) -> Sequence[Row[tuple[str, SubmissionStatus, int]]]:
    """Stage submissions counted per (department, status).

    The statuses are returned raw. Which of them means "waiting on a reviewer"
    and which means "decided" is the Review Engine's call, and the caller asks
    it — this only counts rows.
    """
    stmt = (
        select(Problem.department, StageSubmission.status, func.count())
        .select_from(StageSubmission)
        .join(Project, Project.id == StageSubmission.project_id)
        .join(Problem, Problem.id == Project.problem_id)
        .where(Project.institution_id == institution_id, Project.deleted_at.is_(None))
        .group_by(Problem.department, StageSubmission.status)
    )
    return list(db.execute(stmt).all())


def monthly_projects(
    db: Session, *, institution_id: uuid.UUID, since: datetime
) -> dict[datetime, int]:
    """Projects started per calendar month since `since`, keyed by the month's start.

    `created_at` is written once, when the application creates the project, and
    never moved. Months with no projects are absent; the caller owns the window
    and fills its own gaps.
    """
    # Cut in UTC, for the reason credits.repository.monthly_points gives.
    month = func.date_trunc("month", func.timezone("UTC", Project.created_at))
    stmt = (
        select(month, func.count())
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            Project.created_at >= since,
        )
        .group_by(month)
    )
    return {start: int(count) for start, count in db.execute(stmt)}


def review_turnaround_days(db: Session, *, institution_id: uuid.UUID) -> float | None:
    """Mean days from a stage being submitted to a reviewer deciding it.

    None when nothing has been reviewed yet — an institution with no verdicts
    has no turnaround, and zero would claim an instant one.

    A stage has one row, so a resubmitted stage carries only its latest cycle:
    this is how long the *current* verdict took, not the sum of every attempt.
    """
    seconds = func.avg(
        func.extract("epoch", StageSubmission.reviewed_at - StageSubmission.submitted_at)
    )
    stmt = (
        select(seconds)
        .select_from(StageSubmission)
        .join(Project, Project.id == StageSubmission.project_id)
        .where(
            Project.institution_id == institution_id,
            Project.deleted_at.is_(None),
            StageSubmission.reviewed_at.is_not(None),
            StageSubmission.submitted_at.is_not(None),
        )
    )
    average = db.execute(stmt).scalar_one()
    return None if average is None else float(average) / 86_400
