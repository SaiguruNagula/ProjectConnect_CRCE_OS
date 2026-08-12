"""Every ownership and tenancy predicate lives here (BACKEND_ARCHITECTURE.md §15).

Routers declare, this module decides. Predicates are pure so they can be unit
tested without a request; the `ensure_*` helpers raise the correct status code.

Fail-safe rule: if a predicate cannot establish permission, it returns False and
the caller denies. There is no permissive fallback anywhere in this file.
"""

from __future__ import annotations

import uuid
from typing import Protocol

from app.common.errors import AuthorizationError, NotFoundError
from app.modules.users.models import User


class HasInstitution(Protocol):
    institution_id: uuid.UUID


class HasLeader(Protocol):
    leader_id: uuid.UUID


class HasAuthor(Protocol):
    created_by: uuid.UUID


class HasMentor(Protocol):
    mentor_id: uuid.UUID


def same_institution(user: User, resource: HasInstitution | None) -> bool:
    if resource is None:
        return False
    return user.institution_id == resource.institution_id


def is_self(user: User, user_id: uuid.UUID) -> bool:
    return user.id == user_id


def is_team_lead(user: User, team: HasLeader | None) -> bool:
    return team is not None and team.leader_id == user.id


def is_problem_author(user: User, problem: HasAuthor | None) -> bool:
    return problem is not None and problem.created_by == user.id


def is_nominated_mentor(user: User, resource: HasMentor | None) -> bool:
    """The mentor named on a suggestion, or the mentor assigned to a project."""
    return resource is not None and resource.mentor_id == user.id


def ensure_same_institution[T: HasInstitution](user: User, resource: T | None) -> T:
    """404, not 403: a caller must not learn that another tenant's row exists."""
    if resource is None or not same_institution(user, resource):
        raise NotFoundError("Resource not found.")
    return resource


def ensure_self(user: User, user_id: uuid.UUID) -> None:
    if not is_self(user, user_id):
        raise AuthorizationError("You do not have permission to perform this action.")


def ensure(allowed: bool, message: str) -> None:
    """Deny with 403 unless the caller-supplied predicate holds."""
    if not allowed:
        raise AuthorizationError(message)
