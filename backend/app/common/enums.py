"""Enumerations shared across modules, backed by native PostgreSQL enum types.

Values match the frozen frontend contract exactly (types/index.ts `Role`,
domain.ts `InstitutionStatus` and `DirectoryUser.status`).
"""

from __future__ import annotations

from enum import Enum, StrEnum

import sqlalchemy as sa


class UserRole(StrEnum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"
    PRINCIPAL = "principal"


class UserStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"


class InstitutionStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"


class ProblemStatus(StrEnum):
    """domain.ts `ProblemStatus`. Published problems start OPEN (ADR-10)."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class ProblemSuggestionStatus(StrEnum):
    DRAFT = "draft"
    PENDING_MENTOR_REVIEW = "pending_mentor_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"


class SubmissionStage(StrEnum):
    """The stages a student actually submits.

    domain.ts `SubmissionStage` also carries `selection`, which is a faculty
    decision held on `projects`, not a submission — it is never a row here.
    """

    IDEA = "idea"
    POC = "poc"
    FINAL = "final"


class SubmissionStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    REJECTED = "rejected"


class SelectionStatus(StrEnum):
    NOT_REVIEWED = "not_reviewed"
    CHANGES_REQUESTED = "changes_requested"
    SELECTED = "selected"
    NOT_SELECTED = "not_selected"


class ApplicationStatus(StrEnum):
    ACTIVE = "active"
    WITHDRAWN = "withdrawn"


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class JoinRequestStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


def pg_enum(enum_class: type[Enum], name: str) -> sa.Enum:
    """Persist the enum *values* ('student'), not the member names ('STUDENT')."""
    return sa.Enum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )


ROLE_ENUM = pg_enum(UserRole, "role_enum")
USER_STATUS_ENUM = pg_enum(UserStatus, "user_status")
INSTITUTION_STATUS_ENUM = pg_enum(InstitutionStatus, "inst_status")
PROBLEM_STATUS_ENUM = pg_enum(ProblemStatus, "problem_status")
PROBLEM_SUGGESTION_STATUS_ENUM = pg_enum(ProblemSuggestionStatus, "problem_suggestion_status")
SUBMISSION_STAGE_ENUM = pg_enum(SubmissionStage, "submission_stage")
SUBMISSION_STATUS_ENUM = pg_enum(SubmissionStatus, "submission_status")
SELECTION_STATUS_ENUM = pg_enum(SelectionStatus, "selection_status")
APPLICATION_STATUS_ENUM = pg_enum(ApplicationStatus, "application_status")
INVITATION_STATUS_ENUM = pg_enum(InvitationStatus, "invitation_status")
JOIN_REQUEST_STATUS_ENUM = pg_enum(JoinRequestStatus, "join_request_status")

# The frontend ships a fixed list (constants/catalog.ts DIFFICULTIES); it stays a
# validated string rather than a ninth enum type because nothing queries on it.
DIFFICULTIES = ("Beginner", "Intermediate", "Advanced")
