"""Problem request/response schemas.

Field constraints are the frontend's zod rules (CreateProblemPage,
SuggestProblemDialog) restated at the trust boundary — client validation is
never relied on. Read models mirror domain.ts exactly: `statement`,
`current_challenge`, `expected_impact` and `allow_individual` are captured on
creation but absent from `Problem`, so they are stored and not served back.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

from app.common.enums import DIFFICULTIES, ProblemStatus, ProblemSuggestionStatus

Difficulty = Literal["Beginner", "Intermediate", "Advanced"]
ApplicationParticipation = Literal["none", "team", "solo"]
ProblemSort = Literal["newest", "credits"]


class ProblemAttachment(BaseModel):
    name: str
    type: str
    url: str


class ProblemMilestone(BaseModel):
    label: str
    date: str
    done: bool


class ProblemOut(BaseModel):
    """domain.ts `Problem` — the single read model for the catalog and details."""

    id: uuid.UUID
    title: str
    summary: str
    department: str
    difficulty: str
    skills: list[str]
    faculty_name: str
    faculty_id: uuid.UUID
    team_size: int
    current_team_count: int
    timeline_weeks: int
    credit_reward: int
    applicants_count: int
    solutions_count: int | None
    end_date: date
    attachments: list[ProblemAttachment]
    timeline: list[ProblemMilestone]
    status: ProblemStatus
    bookmarked: bool
    application_status: ApplicationParticipation


class ProblemCatalogStats(BaseModel):
    problems: int
    departments: int
    teams: int


class ProblemCatalogPage(BaseModel):
    """domain.ts `ProblemCatalogPage`.

    Not the generic `Paginated` envelope: the catalog additionally carries the
    department facet and the headline stats, both describing the whole catalog
    rather than the current page.
    """

    items: list[ProblemOut]
    page: int
    limit: int
    total: int
    total_pages: int
    departments: list[str]
    stats: ProblemCatalogStats


class ProblemCreate(BaseModel):
    """domain.ts `CreateProblemInput`.

    `facultyName` is deliberately absent: the author is the authenticated
    faculty member, and a client-supplied name is ignored rather than trusted.
    """

    title: str = Field(min_length=5, max_length=200)
    department: str = Field(min_length=2, max_length=120)
    summary: str = Field(min_length=10)
    statement: str = Field(min_length=20)
    current_challenge: str | None = None
    expected_impact: str | None = None
    difficulty: Difficulty
    skills: list[str] = Field(min_length=1)
    tools: list[str] = Field(default_factory=list)
    team_size: int = Field(ge=1, le=6)
    allow_individual_entry: bool = True
    registration_date: date
    deadline_date: date
    base_credits: int = Field(ge=50, le=5000)

    @model_validator(mode="after")
    def _deadline_after_registration(self) -> ProblemCreate:
        if self.deadline_date < self.registration_date:
            raise ValueError("The deadline must fall on or after the registration date.")
        return self

    @field_validator("skills", "tools")
    @classmethod
    def _trim_entries(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]

    @field_validator("difficulty")
    @classmethod
    def _known_difficulty(cls, value: str) -> str:
        if value not in DIFFICULTIES:
            raise ValueError("Unknown difficulty.")
        return value


class ProblemDraftOut(BaseModel):
    id: uuid.UUID
    saved_at: datetime
    input: dict


class MentorOption(BaseModel):
    """domain.ts `MentorOption` — faculty a student may nominate."""

    id: uuid.UUID
    name: str
    # No departments table in the pilot, so this is unset until one exists.
    department: str | None = None


class ProblemSuggestionInput(BaseModel):
    title: str = Field(min_length=8, max_length=200)
    description: str = Field(min_length=40)
    category: str = Field(min_length=2, max_length=120)
    importance: str = Field(min_length=30)
    expected_impact: str = Field(min_length=20)
    mentor_id: uuid.UUID
    reference_links: list[HttpUrl] = Field(default_factory=list)


class ProblemSuggestionOut(BaseModel):
    id: uuid.UUID
    status: ProblemSuggestionStatus
    input: ProblemSuggestionInput
    mentor_name: str
    submitted_by: str
    submitted_at: datetime
    reviewed_at: datetime | None = None
    mentor_feedback: str | None = None
    published_problem_id: uuid.UUID | None = None


class SuggestionDecisionInput(BaseModel):
    decision: Literal["approved", "changes_requested", "rejected"]
    feedback: str = ""
