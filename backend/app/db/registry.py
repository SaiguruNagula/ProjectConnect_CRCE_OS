"""Single import point for every ORM model.

Alembic autogenerate and Base.metadata only see tables whose module has been
imported. Each module adds its models here as it lands.
"""

from __future__ import annotations

from app.common.audit import AuditLog
from app.modules.auth.models import RefreshToken
from app.modules.institutions.models import Institution
from app.modules.users.models import User

__all__ = ["AuditLog", "Institution", "RefreshToken", "User"]
