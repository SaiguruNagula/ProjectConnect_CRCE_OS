"""Application and project-space schemas.

Stage payload constraints are the zod rules from IdeaStage/PocStage/FinalStage
restated at the trust boundary. All evidence is a URL — nothing here accepts a
file, and Phase 3 uploads nothing.

`stage`, `stageStatus`, `progress`, `status`, `currentStage`, `unlockedStages`
and the timeline are all derived on read; none of them is a column and none is
accepted from a client.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

from app.common.enums import SelectionStatus, SubmissionStatus
from app.modules.teams.schemas import TeamMemberOut

# domain.ts `SubmissionStage` — `selection` is a faculty decision, not a
# student submission, which is why it has no payload schema below.
JourneyStage = Literal["idea", "poc", "selection", "final"]
ProjectStatus = Literal["active", "in_review", "completed"]
LifecycleStatus = Literal[
    "idea_submitted",
    "idea_approved",
    "poc_submitted",
    "poc_approved",
    "selected_for_final",
    "final_submitted",
    "approved",
    "rejected",
    "changes_requested",
    "completed",
]

OptionalUrl = HttpUrl | None


class ApplicationInput(BaseModel):
    """domain.ts `ApplicationInput` — omit `team_id` to apply solo."""

    team_id: uuid.UUID | None = None
    idea_summary: str = Field(min_length=20)
    approach: str = Field(min_length=20)
    attachment_url: OptionalUrl = None


class IdeaSubmissionIn(BaseModel):
    title: str = Field(min_length=4, max_length=200)
    problem_statement: str = Field(min_length=30)
    proposed_solution: str = Field(min_length=30)
    approach: str = Field(min_length=30)
    tech_stack: list[str] = Field(min_length=1)
    expected_outcome: str = Field(min_length=20)
    presentation_url: OptionalUrl = None
    supporting_links: list[HttpUrl] = Field(default_factory=list)


class PocSubmissionIn(BaseModel):
    description: str = Field(min_length=30)
    github_url: HttpUrl
    demo_url: OptionalUrl = None
    prototype_images: list[HttpUrl] = Field(default_factory=list)
    presentation_url: OptionalUrl = None
    video_url: OptionalUrl = None
    documents: list[HttpUrl] = Field(default_factory=list)


class FinalSubmissionIn(BaseModel):
    description: str = Field(min_length=30)
    github_url: HttpUrl
    live_url: OptionalUrl = None
    demo_url: OptionalUrl = None
    presentation_url: OptionalUrl = None
    report_url: OptionalUrl = None
    video_url: OptionalUrl = None
    tech_stack: list[str] = Field(min_length=1)
    screenshots: list[HttpUrl] = Field(default_factory=list)
    documents: list[HttpUrl] = Field(default_factory=list)


class StageReviewOut(BaseModel):
    """Faculty verdict. Phase 3 never writes it — Phase 4 owns every field."""

    strengths: str | None = None
    weaknesses: str | None = None
    suggestions: str | None = None
    comments: str | None = None
    reviewed_by: str | None = None
    evaluation: dict | None = None


class StageStateOut(BaseModel):
    status: SubmissionStatus
    data: dict | None = None
    saved_at: datetime | None = None
    submitted_at: datetime | None = None
    review: StageReviewOut | None = None
    reviewed_at: datetime | None = None


class SelectionStateOut(BaseModel):
    status: SelectionStatus
    feedback: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None


class TimelineEventOut(BaseModel):
    status: LifecycleStatus
    label: str
    at: datetime | None = None
    done: bool


class ProjectOut(BaseModel):
    """domain.ts `Project` — the list read model, stage already joined on."""

    id: uuid.UUID
    title: str
    summary: str
    status: ProjectStatus
    progress: int
    mentor_name: str
    members: list[TeamMemberOut]
    problem_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    stage: JourneyStage
    stage_status: str
    completed_at: datetime | None = None


class ProjectJourneyOut(BaseModel):
    """domain.ts `ProjectJourney` — the whole workspace in one response."""

    project_id: uuid.UUID
    title: str
    problem_id: uuid.UUID | None = None
    problem_title: str | None = None
    team_id: uuid.UUID | None = None
    team_name: str
    mentor_name: str
    members: list[TeamMemberOut]
    current_stage: JourneyStage
    unlocked_stages: list[JourneyStage]
    idea: StageStateOut
    poc: StageStateOut
    selection: SelectionStateOut
    final: StageStateOut
    status: LifecycleStatus
    timeline: list[TimelineEventOut]
    # Credits arrive with the Credit Engine (Phase 5); the field stays in the
    # contract so the workspace does not change shape when they do.
    credits: dict | None = None
    published: bool = False
