"""The dashboard read models (Phases 6, 8, 11 and 13).

A dashboard owns no facts. Every number below is asked of the module that
decides it — the Credit Engine for the balance, the Leaderboard for the rank,
the Review Engine for what "pending" and "decided" mean, the projects
repository for what the student is on — and this module only gathers them into
one response. Nothing here sums a ledger, orders a board or decides what
"completed" means.

Phase 13 added the institution's department breakdown and its monthly
throughput. Both are aggregations, not new facts: the department of a project is
the department its problem was published under, and a month of throughput is
rows counted by the timestamp they were written with. Neither introduces a
metric the platform does not already record, and neither is stored — they are
recomputed from canonical rows on every read, so they cannot drift.

Still absent, still for want of a source: `activity` lives in the audit module,
a deadline has no column anywhere, and an innovation health index needs a rubric
nobody has written.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.common.enums import SubmissionStatus, UserRole
from app.modules.credits import repository as credits_repo
from app.modules.dashboard import repository as repo
from app.modules.dashboard.schemas import (
    DepartmentStatsOut,
    FacultyDashboardOut,
    MonthPointOut,
    PrincipalDashboardOut,
    StudentDashboardOut,
)
from app.modules.institutions import repository as institutions_repo
from app.modules.leaderboard import service as leaderboard
from app.modules.problems import repository as problems_repo
from app.modules.projects import repository as projects_repo
from app.modules.projects import service as projects_service
from app.modules.reviews import service as reviews
from app.modules.teams import repository as teams_repo
from app.modules.users import repository as users_repo
from app.modules.users.models import User

# How far the growth chart looks back. Six months is the window the chart was
# drawn for; nothing older is discarded, it is simply not asked for.
GROWTH_MONTHS = 6

# The Review Engine's verdicts, read off the map it decides them with, so a new
# verdict joins this set the day it is added rather than the day someone
# remembers to update a list here.
DECIDED = frozenset(reviews.STATUS_FOR.values())

PENDING_TASKS_DEFINITION = """
Work the platform has already recorded as waiting on *this* student:

  1. stage submissions on their projects returned with CHANGES_REQUESTED —
     a reviewer asked for a revision and the student has to resubmit; and
  2. team invitations addressed to them still PENDING — someone asked them to
     join and they have not answered.

Both are persisted state that already exists. Nothing is derived from a clock,
so the count is deterministic: the same database gives the same number.

Not counted: `Project.selection_status == CHANGES_REQUESTED`. The enum has the
member but no writer — a "changes" verdict at the PoC stage settles nothing on
the project — so reading it would add a column that is never true rather than a
second source of tasks.
"""


def _rank_of(db: Session, student: User) -> int | None:
    """The student's own row on the Leaderboard, or None if they have none.

    The board is already ranked by the Leaderboard against the canonical ledger.
    This picks a row out of it; it does not compute, re-order or tie-break.
    """
    board = leaderboard.board(db, student, UserRole.STUDENT)
    return next((entry.rank for entry in board if entry.id == student.id), None)


def student(db: Session, student_user: User) -> StudentDashboardOut:
    """The caller's own dashboard. There is no other student to reach: identity
    and institution both come from the token, and every query below is scoped
    to them."""
    scope = {
        "institution_id": student_user.institution_id,
        "student_id": student_user.id,
    }

    projects = projects_repo.list_for_student(db, **scope)
    # `completed_at` is written by the Credit Engine when it awards a completed
    # project — the projects module's one definition of finished. Active is its
    # complement; there is no new status here.
    active = sum(1 for project in projects if project.completed_at is None)

    invitations = teams_repo.pending_invitations_for(
        db, email=student_user.email, institution_id=student_user.institution_id
    )

    return StudentDashboardOut(
        total_credits=credits_repo.balance(db, student_user.id),
        rank=_rank_of(db, student_user),
        active_projects=active,
        pending_tasks=repo.changes_requested_submissions(db, **scope) + len(invitations),
    )


def faculty(db: Session, faculty_user: User) -> FacultyDashboardOut:
    """The caller's own impact metrics. Like `student` above, there is no other
    faculty member to reach: the mentor and the institution are the token's.

    Three of the four numbers are counted off one canonical list — the projects
    the projects module says this person mentors — rather than asked for with
    three queries of this module's own devising. The fourth is the Credit
    Engine's sum of its own awards.
    """
    projects = list(
        projects_repo.list_for_mentor(
            db, institution_id=faculty_user.institution_id, mentor_id=faculty_user.id
        )
    )

    # The same roster the Review Engine shows on a queue card: a team's members,
    # or the lone applicant on a solo project. A student mentored on three
    # projects is one student guided.
    rosters = projects_service.members_by_project(db, projects)
    guided = {member.id for members in rosters.values() for member in members}

    return FacultyDashboardOut(
        projects_mentored=len(projects),
        students_guided=len(guided),
        credits_awarded=credits_repo.awarded_total_by(
            db, institution_id=faculty_user.institution_id, faculty_id=faculty_user.id
        ),
        # `published` is set by the publication endpoint, which alone decides
        # what may be published. Counting the flag adds no second rule.
        solutions_published=sum(1 for project in projects if project.published),
    )


def _departments(db: Session, institution_id: uuid.UUID) -> list[DepartmentStatsOut]:
    """Every department the institution has published a problem under, counted.

    Three reads folded together, none of which decides anything: the projects
    and their departments, the Credit Engine's per-project payout, and the stage
    submissions grouped by status. The department list itself is the problems
    module's — a department that has published a problem but has yet to see a
    project is a real row of zeros, not an omission.
    """
    projects = repo.department_projects(db, institution_id=institution_id)
    payouts = credits_repo.points_by_project(db, institution_id=institution_id)
    submissions = repo.submission_statuses_by_department(db, institution_id=institution_id)

    active: Counter[str] = Counter()
    completed: Counter[str] = Counter()
    credits: Counter[str] = Counter()
    for project_id, department, is_completed in projects:
        (completed if is_completed else active)[department] += 1
        credits[department] += payouts.get(project_id, 0)

    pending: Counter[str] = Counter()
    decided: Counter[str] = Counter()
    approved: Counter[str] = Counter()
    for department, status, count in submissions:
        if status in reviews.PENDING:
            pending[department] += count
        if status in DECIDED:
            decided[department] += count
        if status is SubmissionStatus.APPROVED:
            approved[department] += count

    rows = [
        DepartmentStatsOut(
            name=name,
            active_projects=active[name],
            completed_projects=completed[name],
            pending_reviews=pending[name],
            decided_reviews=decided[name],
            approved_reviews=approved[name],
            credits=credits[name],
        )
        for name in problems_repo.departments(db, institution_id)
    ]
    # Busiest first, and alphabetical among equals so the table is stable
    # between reads rather than reordering itself on a tie.
    rows.sort(key=lambda row: (-row.active_projects, row.name))
    return rows


def _month_starts(now: datetime) -> list[datetime]:
    """The last GROWTH_MONTHS calendar month starts in UTC, oldest first."""
    start = now.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    starts = [start]
    while len(starts) < GROWTH_MONTHS:
        # The day before the first of a month is the last of the previous one;
        # arithmetic no calendar can argue with.
        starts.insert(0, (starts[0] - timedelta(days=1)).replace(day=1))
    return starts


def _growth(db: Session, institution_id: uuid.UUID) -> list[MonthPointOut]:
    """Credits posted and projects started, month by month, from real timestamps.

    Nothing is interpolated and nothing is projected: each month is the rows the
    database already holds for it, and a quiet month is a zero. An institution
    with no history in the window gets no chart at all rather than a flat line,
    which would state that six months passed without activity when in truth the
    institution has not been here that long.
    """
    starts = _month_starts(datetime.now(UTC))
    since = starts[0]
    credits = credits_repo.monthly_points(db, institution_id=institution_id, since=since)
    projects = repo.monthly_projects(db, institution_id=institution_id, since=since)
    if not credits and not projects:
        return []

    # Keyed by (year, month) rather than by the timestamp itself: the two reads
    # come back from different tables and only their calendar month has to match.
    by_month = {(start.year, start.month): int(total) for start, total in credits.items()}
    started = {(start.year, start.month): count for start, count in projects.items()}
    return [
        MonthPointOut(
            month=f"{start.year:04d}-{start.month:02d}",
            credits=by_month.get((start.year, start.month), 0),
            projects=started.get((start.year, start.month), 0),
        )
        for start in starts
    ]


def principal(db: Session, principal_user: User) -> PrincipalDashboardOut:
    """The caller's own institution, counted (Phase 11).

    The first dashboard whose subject is a tenant rather than a person, and the
    only thing that changes: the scope is `institution_id` instead of `id`. It
    still comes from the token, there is still no parameter, and every count
    below is still the owning module's — the users module's headcount, the
    projects module's `completed_at`, the problems module's status, the teams
    module's soft delete, the Credit Engine's sum. This function calls them and
    fills in a schema.

    Phase 13 added three more, on the same terms: a department breakdown, six
    months of throughput and the review turnaround. Every one of them is folded
    from rows the owning modules wrote, and none of them is stored.

    Still deliberately absent, because no canonical source exists: an innovation
    health index (no rubric), publication and patent counts (no domain) and any
    rank against another institution (Phase 14 reads a second tenant; this one
    reads the token's). None of them are estimated here.
    """
    institution_id = principal_user.institution_id
    by_role = users_repo.counts_by_role(db, institution_id)
    active, completed = projects_repo.counts_by_completion(db, institution_id)
    institution = institutions_repo.get_by_id(db, institution_id)

    return PrincipalDashboardOut(
        # `full_name` is the formal name the letterhead uses; `name` is the short
        # one. A principal's console gets the formal one.
        institution_name=institution.full_name if institution else "",
        students=by_role.get(UserRole.STUDENT, 0),
        faculty=by_role.get(UserRole.FACULTY, 0),
        active_projects=active,
        completed_projects=completed,
        open_problems=problems_repo.open_count(db, institution_id),
        active_teams=teams_repo.active_count(db, institution_id),
        total_credits=credits_repo.institution_total(db, institution_id),
        departments=_departments(db, institution_id),
        growth=_growth(db, institution_id),
        avg_review_days=repo.review_turnaround_days(db, institution_id=institution_id),
    )
