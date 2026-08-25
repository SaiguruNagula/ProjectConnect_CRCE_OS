"""Institution self-service and the public campus aggregate (Phase 14, ADR-9).

ADR-9 decides what this module can honestly do:

    ONE COLLEGE = ONE DEPLOYMENT = ONE POSTGRESQL DATABASE = ONE INSTITUTION

So an ADMIN here administers *their own* institution and nothing else. The
console's directory is the caller's own institution — one row, because one row
is what a deployment has — and there is no create, no status change and no
platform view, because those are control-plane operations and ADR-9 rejected
the control plane. Provisioning stays where it already is: `scripts/create_admin.py`,
run once at installation.

This module owns institution identity and status. It owns none of the numbers
beside them: the headcount is the users module's, the project count the
projects module's, the credit total the Credit Engine's. Each is read through
the accessor the principal dashboard already calls, so the two consoles cannot
report different figures for the same institution.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import UserRole
from app.common.errors import BusinessRuleError, NotFoundError
from app.modules.credits import repository as credits_repo
from app.modules.institutions import repository as repo
from app.modules.institutions.models import Institution
from app.modules.institutions.schemas import (
    AdminInstitutionOut,
    CampusMetricOut,
    InstitutionOut,
    InstitutionPrincipalOut,
    InstitutionUpdate,
)
from app.modules.projects import repository as projects_repo
from app.modules.users import repository as users_repo
from app.modules.users.models import User


def _principal_of(institution: Institution) -> InstitutionPrincipalOut | None:
    """The named principal, or nothing. A name without an address is not one."""
    if not institution.principal_name or not institution.principal_email:
        return None
    return InstitutionPrincipalOut(
        name=institution.principal_name,
        email=institution.principal_email,
        verified=institution.principal_verified,
    )


def _with_counts(db: Session, institution: Institution) -> AdminInstitutionOut:
    """Identity from this module, every count from the module that owns it."""
    by_role = users_repo.counts_by_role(db, institution.id)
    active, completed = projects_repo.counts_by_completion(db, institution.id)
    return AdminInstitutionOut(
        # The identity half is `InstitutionOut`, unchanged and read once.
        **InstitutionOut.model_validate(institution).model_dump(),
        principal=_principal_of(institution),
        students=by_role.get(UserRole.STUDENT, 0),
        faculty=by_role.get(UserRole.FACULTY, 0),
        # Both halves: the console counts the institution's projects, not the
        # live ones. The split itself belongs to the principal dashboard.
        projects=active + completed,
        credits=credits_repo.institution_total(db, institution.id),
    )


def directory(db: Session, admin: User) -> list[AdminInstitutionOut]:
    """The console's directory: the caller's own institution, and only it.

    A list of one rather than an object, because the frozen console renders a
    table and a table of one row is the honest shape of a single-institution
    deployment. The id comes from the token; there is no parameter to widen it
    and no second row for one to reach.
    """
    institution = repo.get_by_id(db, admin.institution_id)
    if institution is None:
        # The FK makes this unreachable; deny rather than return a null tenant.
        raise NotFoundError("Institution not found.")
    return [_with_counts(db, institution)]


def update(db: Session, admin: User, payload: InstitutionUpdate) -> AdminInstitutionOut:
    """Edit the caller's own institution profile.

    The row edited is `admin.institution_id`, never an id from the request:
    `InstitutionUpdate` carries no identifier at all, so there is nothing for a
    caller to point at another tenant even in a deployment holding two rows.
    """
    institution = repo.get_by_id(db, admin.institution_id)
    if institution is None:
        raise NotFoundError("Institution not found.")

    code = payload.code.strip()
    if code != institution.code and repo.code_taken(db, code, exclude_id=institution.id):
        raise BusinessRuleError("That institution code is already in use.")

    # Naming a different principal drops the verified flag. Nothing verifies an
    # identity yet, so carrying a true flag onto a new address would state
    # something the platform never checked.
    if payload.principal_email != institution.principal_email:
        institution.principal_verified = False

    for field, value in payload.model_dump().items():
        setattr(institution, field, value)

    record_audit(
        db,
        action="institution.updated",
        entity="institution",
        entity_id=str(institution.id),
        actor_id=admin.id,
        institution_id=institution.id,
        # Field names, never values: the audit log records that the profile
        # changed, not a second copy of the institution's details.
        meta={"fields": sorted(payload.model_dump().keys())},
    )
    db.commit()
    db.refresh(institution)
    return _with_counts(db, institution)


def campus_impact(db: Session) -> list[CampusMetricOut]:
    """The public headline figures (Landing, About, Innovation Hub).

    Anonymous and pre-auth, so the rule is absolute: **counts only**. No name,
    no email, no department, no project, no problem, no credit belonging to a
    person, no audit row, no notification and no per-institution breakdown ever
    appears here. Four labelled integers leave this function and nothing else can.

    Aggregated over ACTIVE institutions, which under ADR-9 is this deployment's
    one institution. It is summed through the same per-institution accessors the
    consoles read rather than a second cross-tenant query, so the public bar and
    the private dashboards count the same rows the same way.

    'Problems Solved' is absent, as it is on the principal's pages: nothing in
    `app/` ever writes `ProblemStatus.CLOSED`, so the figure would be a
    permanent zero dressed up as an achievement.
    """
    institutions = repo.active(db)
    if not institutions:
        # Nothing to report rather than a row of zeros. The bar hides itself.
        return []

    students = faculty = projects = credits = 0
    for institution in institutions:
        by_role = users_repo.counts_by_role(db, institution.id)
        students += by_role.get(UserRole.STUDENT, 0)
        faculty += by_role.get(UserRole.FACULTY, 0)
        _, completed = projects_repo.counts_by_completion(db, institution.id)
        # 'Projects Built' is what finished, on the Credit Engine's definition
        # of finished — the same `completed_at` the dashboards split on.
        projects += completed
        credits += credits_repo.institution_total(db, institution.id)

    return [
        CampusMetricOut(label="Students", value=students),
        CampusMetricOut(label="Faculty Mentors", value=faculty),
        CampusMetricOut(label="Projects Built", value=projects),
        CampusMetricOut(label="Credits Earned", value=credits),
    ]
