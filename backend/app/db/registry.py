"""Single import point for every ORM model.

Alembic autogenerate and Base.metadata.create_all only see tables whose module
has been imported. Each module adds its models here as it lands.
"""

from __future__ import annotations

# Modules register their models here from Phase 2 onwards.
__all__: list[str] = []
