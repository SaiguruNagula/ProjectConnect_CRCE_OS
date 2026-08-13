"""The Solutions Hub read model.

Discovery only. Publishing is a mentor's verb on a project
(`POST /projects/{id}/publication`) and stays there; unpublishing is the same
verb with `publish: false`, so a solution leaves the hub the moment the
canonical flag flips. Nothing here writes, scores, ranks or caches.

The deployment link is not built by this module and never by the frontend: it
is the `live_url` the team submitted on the final stage, which `HttpUrl`
validated at the trust boundary. The payload is JSONB, so it is checked again
on the way out and only an http(s) destination is ever handed to a browser.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.projects import service as projects
from app.modules.solutions import repository as repo
from app.modules.solutions.schemas import SolutionOut, SolutionStatsOut
from app.modules.users.models import User

# Everything else — javascript:, data:, file:, a bare hostname, a relative path
# — is not a destination this product will put behind a link.
SAFE_SCHEMES = ("https://", "http://")


def _url(payload: dict | None, key: str) -> str | None:
    value = (payload or {}).get(key)
    if not isinstance(value, str):
        return None
    return value if value.lower().startswith(SAFE_SCHEMES) else None


def _tags(payload: dict | None) -> list[str]:
    """The stack the team actually shipped on, as submitted."""
    values = (payload or {}).get("tech_stack")
    return [tag for tag in values if isinstance(tag, str)] if isinstance(values, list) else []


def catalog(db: Session, viewer: User) -> list[SolutionOut]:
    """Every deployed solution of the viewer's own institution."""
    rows = repo.published(db, institution_id=viewer.institution_id)
    members = projects.members_by_project(db, [row[0] for row in rows])
    return [
        SolutionOut(
            id=project.id,
            project_id=project.id,
            name=project.title,
            description=project.summary,
            category=department,
            tags=_tags(payload),
            url=_url(payload, "live_url"),
            github_url=_url(payload, "github_url"),
            demo_url=_url(payload, "demo_url"),
            problem_id=project.problem_id,
            problem_title=problem_title,
            team_id=project.team_id,
            mentor_name=mentor_name or "",
            builders=members.get(project.id, []),
            credits=credits,
        )
        for project, problem_title, department, mentor_name, payload, credits in rows
    ]


def stats(db: Session, viewer: User) -> SolutionStatsOut:
    """The hero counters, over the whole hub rather than a filtered page."""
    live, departments = repo.headline(db, institution_id=viewer.institution_id)
    return SolutionStatsOut(
        live_solutions=live,
        contributors=repo.contributors(db, institution_id=viewer.institution_id),
        departments=departments,
    )
