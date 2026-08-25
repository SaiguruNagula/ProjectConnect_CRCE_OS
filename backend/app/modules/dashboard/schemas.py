"""Dashboard response schema.

Numbers only. The labels ("Total Credits"), the icons and the card order are
presentation, and they stay in the frontend where they already live — a
dashboard that shipped Material icon names from the database would make the
backend the owner of a design decision it has no business owning.
"""

from __future__ import annotations

from pydantic import BaseModel


class StudentDashboardOut(BaseModel):
    """The four counters the Student Dashboard reads, each from its own owner."""

    # credits.repository.balance — the Credit Engine's number, not a second sum.
    total_credits: int
    # The rank the Leaderboard already computed. Null until the student has a
    # ledger row: an unranked student has no rank, and inventing one (last
    # place? zero?) would state something the platform never decided.
    rank: int | None = None
    # Projects the student is on that the Credit Engine has not completed yet.
    active_projects: int
    # See dashboard.service.PENDING_TASKS_DEFINITION.
    pending_tasks: int


class DepartmentStatsOut(BaseModel):
    """One department's standing (Phase 13).

    Counts, never ratios. A completion rate, a success rate and a health verdict
    are all presentation decisions about these numbers, and they stay in the
    frontend repository beside the other tone and formatting rules — the same
    place the admin overview already turns headcounts into percentages.
    """

    # `problems.department`, the only department any row in the platform carries.
    name: str
    # Split on the Credit Engine's `completed_at`, like the institution counters.
    active_projects: int
    completed_projects: int
    # Stage submissions this department's projects are waiting on a reviewer
    # for — the Review Engine's own `PENDING` statuses, not a second definition.
    pending_reviews: int
    # Stages the Review Engine has ruled on, and how many it approved.
    decided_reviews: int
    approved_reviews: int
    # credits.repository.points_by_project, folded by department. What these
    # projects paid out — the ledger's number, netted of revisions.
    credits: int


class MonthPointOut(BaseModel):
    """One month of institutional throughput (Phase 13).

    Real history: both figures are counted off timestamps the rows have carried
    since they were written — the append-only ledger's `created_at` and the
    project's. Nothing is snapshotted, projected or back-filled, and a month in
    which nothing happened is a zero rather than a gap.
    """

    # 'YYYY-MM'. The three-letter label the chart draws is the frontend's.
    month: str
    credits: int
    projects: int


class PrincipalDashboardOut(BaseModel):
    """The institution's counters, each from the module that owns the thing counted.

    Counts and one name. No index and no ranking: the first needs a rubric
    nobody has written and the second needs a second institution (Phase 14). The
    Principal UI shows the figures that exist and hides the panels that do not.
    """

    # institutions.repository.get_by_id — the tenant on the token, not a lookup.
    institution_name: str
    # users.repository.counts_by_role — the same headcount the admin overview reads.
    students: int
    faculty: int
    # projects.repository.counts_by_completion, split on the Credit Engine's
    # `completed_at`. Together they are every live project in the institution.
    active_projects: int
    completed_projects: int
    # Problems the problems module still calls OPEN.
    open_problems: int
    # Teams the teams module has not soft-deleted.
    active_teams: int
    # credits.repository.institution_total — SUM(points), the Credit Engine's
    # number, netted of corrections like every other balance (ADR-5).
    total_credits: int

    # --- Phase 13 ---------------------------------------------------------
    # Ordered by the department that carries the most live projects. Empty for
    # an institution that has published no problems, which is the honest answer
    # rather than a table of dashes.
    departments: list[DepartmentStatsOut] = []
    # The last six months, oldest first — or empty when nothing happened in
    # them, because a flat line of zeros is a claim about a period the
    # institution has not lived through yet.
    growth: list[MonthPointOut] = []
    # Mean days a stage waits for its verdict. Null until something is reviewed.
    avg_review_days: float | None = None


class FacultyDashboardOut(BaseModel):
    """The four impact metrics the Faculty Dashboard reads, each from its owner."""

    # Projects the projects module says this faculty member mentors.
    projects_mentored: int
    # Distinct students on those projects, by the projects module's own roster.
    students_guided: int
    # credits.repository.awarded_total_by — what this mentor's live awards are
    # worth. Not their own balance: the card is about what they gave out.
    credits_awarded: int
    # Mentored projects carrying `Project.published`, the one publication flag.
    solutions_published: int
