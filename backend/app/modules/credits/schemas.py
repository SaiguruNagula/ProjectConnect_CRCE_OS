"""Credit Engine request/response schemas.

The award request is the five components and nothing else: `total` is computed
by the database, `awarded_by` comes from the token and the recipients come from
the project roster, so none of the three is accepted from a client.

These components are NOT the review rubric. A final review scores
`technical_quality`; an award pays a `bonus`. The two never derive from each
other (see BACKEND_ARCHITECTURE.md §21 and domain.ts `CreditAwardInput`).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

Component = Annotated[int, Field(ge=0)]


class CreditAwardIn(BaseModel):
    """domain.ts `CreditAwardInput` — the project comes from the path."""

    model_config = ConfigDict(extra="forbid")

    innovation: Component
    implementation: Component
    documentation: Component
    presentation: Component
    bonus: Component

    @property
    def total(self) -> int:
        """The client's arithmetic, used only to reject an empty award."""
        return (
            self.innovation
            + self.implementation
            + self.documentation
            + self.presentation
            + self.bonus
        )


class PublicationIn(BaseModel):
    """domain.ts `PublicationInput` — the project comes from the path."""

    model_config = ConfigDict(extra="forbid")

    publish: bool


class CreditAwardOut(BaseModel):
    """domain.ts `CreditAward` — what the workspace shows under `credits`."""

    innovation: int
    implementation: int
    documentation: int
    presentation: int
    bonus: int
    total: int
    awarded_by: str | None = None
    awarded_at: datetime | None = None


class CreditTransactionOut(BaseModel):
    """domain.ts `CreditTransaction` — one ledger line."""

    id: uuid.UUID
    date: datetime
    source: str
    points: int
    description: str
    context: str | None = None


class NameValueOut(BaseModel):
    """domain.ts `NameValue` — the credits-by-source breakdown."""

    label: str
    value: int


class CreditCategoryOut(BaseModel):
    """domain.ts `CreditCategory` — a breakdown card with its icon."""

    label: str
    value: int
    icon: str


class CreditRuleOut(BaseModel):
    """domain.ts `CreditRule` — how credits are earned, read-only."""

    id: uuid.UUID
    source: str
    points: int
    description: str


class CreditPipelineItemOut(BaseModel):
    """domain.ts `CreditPipelineItem` — credits a pending submission may earn."""

    id: uuid.UUID
    title: str
    status: str
    detail: str
    potential: int


class CreditSummaryOut(BaseModel):
    """domain.ts `CreditSummary` — balances and milestone progress."""

    engine_version: str
    total: int
    level: int
    level_name: str
    next_level_name: str
    next_milestone: int
    credits_to_next: int
    pct_to_next: int
    current: int
    pending: int
    # Reserved for a future vesting model; there is nothing to lock in V1, so
    # this is always 0 rather than a number nobody can explain.
    locked: int = 0
    lifetime: int
