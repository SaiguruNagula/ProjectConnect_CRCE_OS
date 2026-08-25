"""The one thing the frontend assumes about every payload we send.

The React app does not map our fields onto its own one at a time. It renames
keys — `snake_case` on the wire, `camelCase` in `types/domain.ts` — and trusts
that the rename is reversible, because a request body is renamed back the other
way before it reaches us.

That trust holds only while every field name is lower-case words joined by
single underscores. `total_2` would camelize to `total2` and come back as
`total2`; `problemId` would go out untouched and be read as `problem_id`. Either
one is a field that silently arrives empty in the browser, with nothing on this
side failing. So the assertion lives here, over the whole schema, rather than in
whichever module next adds a column.
"""

from __future__ import annotations

import re

from fastapi.testclient import TestClient

from app.main import app

# Lower-case words, single underscores, and never a digit straight after one.
SNAKE = re.compile(r"^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*$")


def field_names() -> list[tuple[str, str]]:
    """Every (schema, property) pair the API documents."""
    schemas = app.openapi()["components"]["schemas"]
    return [
        (name, field) for name, schema in schemas.items() for field in schema.get("properties", {})
    ]


def test_the_schema_is_not_empty(client: TestClient) -> None:
    """A guard on the guard: an empty walk would pass every test below."""
    assert len(field_names()) > 100


def test_every_field_survives_the_round_trip_to_the_browser(client: TestClient) -> None:
    offenders = [f"{schema}.{field}" for schema, field in field_names() if not SNAKE.match(field)]
    assert not offenders, f"not reversibly snake_case: {offenders}"
