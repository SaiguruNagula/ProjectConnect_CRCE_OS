"""Single import point for every ORM model.

Alembic autogenerate and Base.metadata only see tables whose module has been
imported. Each module adds its models here as it lands.
"""

from __future__ import annotations

from app.common.audit import AuditLog
from app.modules.auth.models import RefreshToken
from app.modules.institutions.models import Institution
from app.modules.problems.models import (
    Problem,
    ProblemBookmark,
    ProblemDraft,
    ProblemSuggestion,
)
from app.modules.projects.models import Application, Project, StageSubmission
from app.modules.teams.models import Team, TeamInvitation, TeamJoinRequest, TeamMember
from app.modules.users.models import User

__all__ = [
    "Application",
    "AuditLog",
    "Institution",
    "Problem",
    "ProblemBookmark",
    "ProblemDraft",
    "ProblemSuggestion",
    "Project",
    "RefreshToken",
    "StageSubmission",
    "Team",
    "TeamInvitation",
    "TeamJoinRequest",
    "TeamMember",
    "User",
]
