"""Review engine request/response schemas.

The request is the faculty verdict only. A reviewer never sends identity, a
timestamp or a status: `reviewed_by` comes from the token and `status` is
derived from the decision, so neither is accepted from the client.

Scores live on the final stage alone (StageReviewPanel renders them only when
`isFinal`); the other stages take free text.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import SubmissionStage
from app.modules.projects.schemas import LifecycleStatus
from app.modules.teams.schemas import TeamMemberOut

# `changes_requested` is the literal the frozen frontend posts (domain.ts
# `ReviewDecision`); `changes` is the short form used throughout this spec.
# Both mean the same verdict and normalise to it.
Decision = Literal["approve", "select", "changes", "changes_requested", "reject"]

Verdict = Literal["approve", "select", "changes", "reject"]

Score = Annotated[int, Field(ge=0, le=10)]

ReviewQueueId = Literal["idea", "poc", "final", "completed"]


class FinalEvaluationIn(BaseModel):
    """domain.ts `FinalEvaluation` — five components out of ten plus remarks."""

    model_config = ConfigDict(extra="forbid")

    innovation: Score
    technical_quality: Score
    implementation: Score
    documentation: Score
    presentation: Score
    overall_remarks: str = ""


class ReviewDecisionIn(BaseModel):
    """domain.ts `StageReviewInput` — the project and stage come from the path."""

    model_config = ConfigDict(extra="forbid")

    decision: Decision
    strengths: str = ""
    weaknesses: str = ""
    suggestions: str = ""
    comments: str = ""
    evaluation: FinalEvaluationIn | None = None

    @property
    def verdict(self) -> Verdict:
        return "changes" if self.decision == "changes_requested" else self.decision

    @property
    def feedback(self) -> tuple[str, str, str, str]:
        return (
            self.strengths.strip(),
            self.weaknesses.strip(),
            self.suggestions.strip(),
            self.comments.strip(),
        )

    @property
    def has_feedback(self) -> bool:
        return any(self.feedback)


class ReviewQueueItemOut(BaseModel):
    """domain.ts `ReviewQueueItem` — one card in a queue."""

    id: uuid.UUID
    project_title: str
    problem_id: uuid.UUID | None = None
    problem_title: str | None = None
    team_id: uuid.UUID | None = None
    team_name: str
    members: list[TeamMemberOut]
    mentor_name: str
    stage: SubmissionStage
    submitted_at: datetime | None = None
    status: LifecycleStatus
    attachment_count: int
    last_reviewed_stage: SubmissionStage | None = None


class ReviewQueuesOut(BaseModel):
    """domain.ts `ReviewQueues` — the four faculty queues in one response."""

    idea: list[ReviewQueueItemOut] = Field(default_factory=list)
    poc: list[ReviewQueueItemOut] = Field(default_factory=list)
    final: list[ReviewQueueItemOut] = Field(default_factory=list)
    completed: list[ReviewQueueItemOut] = Field(default_factory=list)
