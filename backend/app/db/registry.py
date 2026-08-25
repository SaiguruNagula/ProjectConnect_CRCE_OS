"""Single import point for every ORM model.

Alembic autogenerate and Base.metadata only see tables whose module has been
imported. Each module adds its models here as it lands.
"""

from __future__ import annotations

from app.common.audit import AuditLog
from app.modules.auth.models import RefreshToken
from app.modules.credits.models import CreditAward, CreditRule, CreditTransaction
from app.modules.institutions.models import Institution
from app.modules.notifications.models import Notification
from app.modules.problems.models import (
    Problem,
    ProblemBookmark,
    ProblemDraft,
    ProblemSuggestion,
)
from app.modules.profiles.models import FacultyProfile, StudentProfile
from app.modules.projects.models import Application, Project, StageSubmission
from app.modules.teams.models import Team, TeamInvitation, TeamJoinRequest, TeamMember
from app.modules.users.models import User

__all__ = [
    "Application",
    "AuditLog",
    "CreditAward",
    "CreditRule",
    "CreditTransaction",
    "FacultyProfile",
    "Institution",
    "Notification",
    "Problem",
    "ProblemBookmark",
    "ProblemDraft",
    "ProblemSuggestion",
    "Project",
    "RefreshToken",
    "StageSubmission",
    "StudentProfile",
    "Team",
    "TeamInvitation",
    "TeamJoinRequest",
    "TeamMember",
    "User",
]
