"""Solutions Hub response schemas.

A solution is a published project, so it has no identity of its own: `id` is
the project id, which is what keeps the Solutions Hub, the project space, the
portfolio and the leaderboard talking about the same thing.

domain.ts `Solution` also carries `icon`, `status`, `metaLabel`, `metaValue`,
`ctaLabel`, `featured` and `highlightTag`. None of those has a canonical
backend source — they are marketplace ornament from the Stitch mock — so they
are absent here rather than filled with something plausible.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.modules.teams.schemas import TeamMemberOut


class SolutionOut(BaseModel):
    """domain.ts `Solution`, restricted to what the backend can actually verify."""

    # The project id, under both names: the frozen card keys on `id` and links
    # back to the workspace with `projectId`. One value, so they cannot diverge.
    id: uuid.UUID
    project_id: uuid.UUID

    name: str
    description: str
    # The department of the problem this solves. The user model has no
    # department (that blocker is the Profile domain's, not this phase's).
    category: str
    tags: list[str]

    # The deployed destination, straight from the approved final submission.
    # `None` means the team declared no live deployment — the card then routes
    # internally, which is what the frozen frontend already does.
    url: str | None = None
    github_url: str | None = None
    demo_url: str | None = None

    problem_id: uuid.UUID
    problem_title: str
    team_id: uuid.UUID | None = None
    mentor_name: str
    builders: list[TeamMemberOut]

    # The Credit Engine's own award for this project, read not recomputed.
    # `None` while an approved project is published but not yet scored.
    credits: int | None = None


class SolutionStatsOut(BaseModel):
    """domain.ts `SolutionStats`.

    `campusUsers` is absent: CRCE OS does not instrument the deployments it
    links to, so there is no honest number to report.
    """

    live_solutions: int
    contributors: int
    departments: int
