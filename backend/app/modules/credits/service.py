"""The Credit Engine (BACKEND_ARCHITECTURE.md §23, ADR-5).

One engine, one ledger. Awarding is the only way credits enter the system, and
`SUM(credit_transactions.points)` is the only way a total leaves it.

An award is append-only. Revising a project's credits writes a *new* award row,
supersedes the old one and posts the difference to every current member — the
original ledger lines are never touched, so the history of what a team was told
they earned survives the correction.

Approving the final project makes it credit-eligible; awarding the credits is
what completes it (UD-1). Both happen in one transaction or neither does.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import SubmissionStage, SubmissionStatus, UserRole
from app.common.errors import BusinessRuleError, NotFoundError, ValidationError
from app.core import authorize
from app.modules.credits import config
from app.modules.credits import repository as repo
from app.modules.credits.models import CreditAward, CreditTransaction
from app.modules.credits.schemas import (
    CreditAwardIn,
    CreditCategoryOut,
    CreditPipelineItemOut,
    CreditRuleOut,
    CreditSummaryOut,
    CreditTransactionOut,
    NameValueOut,
)
from app.modules.notifications import service as notifications
from app.modules.problems import repository as problems_repo
from app.modules.projects import repository as projects_repo
from app.modules.projects import service as projects
from app.modules.projects.models import Project
from app.modules.projects.schemas import ProjectJourneyOut
from app.modules.users.models import User

FINAL_NOT_APPROVED = "Approve the final project before awarding credits."
EMPTY_AWARD = "Award at least one credit."
NO_RECIPIENTS = "This project has nobody to credit."
UNCHANGED = "These credits are already recorded."


def _mentored(db: Session, faculty: User, project_id: uuid.UUID) -> Project:
    """Another college's project does not exist; a colleague's is not yours."""
    project = projects_repo.get_project(
        db, project_id, institution_id=faculty.institution_id
    )
    if project is None:
        raise NotFoundError("Project not found.")
    authorize.ensure(
        authorize.is_nominated_mentor(faculty, project),
        "Only the assigned mentor can award credits for this project.",
    )
    return project


def _mentor_share(
    db: Session, project: Project, award_row: CreditAward, now: datetime
) -> dict[str, int | None]:
    """Pay the mentor their percentage of the award, and report it for the audit.

    The recipient is `projects.mentor_id` and the rate is the active
    `MENTOR_AWARD_SHARE` rule — neither is a number this function or a request
    body may choose. An institution that has not priced the event pays nothing.

    Cumulative, then delta: the share is always `floor(total * rate / 100)` of
    the *current* award, minus everything this project's awards have already
    paid. A revision upwards adds the difference, a revision downwards posts a
    negative line, and neither edits what was written before.
    """
    rule = repo.active_rule(db, UserRole.FACULTY, config.EVENT_MENTOR_SHARE, now)
    rate = rule.percent_of_award if rule else None
    if rate is None:
        return {"share_rate": None}

    cumulative = award_row.total * rate // 100
    already_paid = repo.mentor_share_paid(
        db, mentor_id=project.mentor_id, project_id=project.id
    )
    delta = cumulative - already_paid
    if delta:
        repo.add_transaction(
            db,
            CreditTransaction(
                institution_id=project.institution_id,
                user_id=project.mentor_id,
                source=config.SOURCE_MENTORSHIP,
                source_id=award_row.id,
                points=delta,
                description=project.title,
                context="Mentorship",
                created_at=now,
            ),
        )
    return {
        "share_rate": rate,
        "share_cumulative": cumulative,
        "share_already_paid": already_paid,
        "share_delta": delta,
    }


def award(
    db: Session, faculty: User, project_id: uuid.UUID, payload: CreditAwardIn
) -> ProjectJourneyOut:
    """Score an approved final project and credit everyone who built it."""
    project = _mentored(db, faculty, project_id)
    if payload.total <= 0:
        raise ValidationError(
            EMPTY_AWARD, errors=[{"field": "total", "message": EMPTY_AWARD}]
        )

    # Project, then stage, then award — the order Phase 4 already locks in, so a
    # decision and an award serialise instead of deadlocking.
    project = projects_repo.lock_project(db, project.id)
    if project is None:
        raise NotFoundError("Project not found.")
    final = projects_repo.lock_submission(
        db, project_id=project.id, stage=SubmissionStage.FINAL
    )
    if final is None or final.status is not SubmissionStatus.APPROVED:
        raise BusinessRuleError(FINAL_NOT_APPROVED)

    problem = problems_repo.get(
        db, project.problem_id, institution_id=project.institution_id
    )
    ceiling = config.award_ceiling(problem.base_credits if problem else 0)
    if payload.total > ceiling:
        raise BusinessRuleError(
            f"This project is worth at most {ceiling} credits."
        )

    previous = repo.lock_active_award(db, project.id)
    delta = payload.total - previous.total if previous else payload.total
    if previous is not None and delta == 0:
        raise BusinessRuleError(UNCHANGED)

    members = projects.members_by_project(db, [project])[project.id]
    if not members:
        raise BusinessRuleError(NO_RECIPIENTS)

    now = datetime.now(UTC)
    if previous is not None:
        # Retire the old row before inserting the new one: the partial unique
        # index allows exactly one live award per project.
        previous.superseded_at = now
        db.flush()

    row = repo.add_award(
        db,
        CreditAward(
            project_id=project.id,
            previous_award_id=previous.id if previous else None,
            innovation=payload.innovation,
            implementation=payload.implementation,
            documentation=payload.documentation,
            presentation=payload.presentation,
            bonus=payload.bonus,
            awarded_by=faculty.id,
            awarded_at=now,
        ),
    )
    # `row.total` is the stored generated column — the database's sum, not ours.
    points = row.total if previous is None else row.total - previous.total
    for member in members:
        repo.add_transaction(
            db,
            CreditTransaction(
                institution_id=project.institution_id,
                user_id=member.id,
                source=config.SOURCE_PROJECT_COMPLETION,
                source_id=row.id,
                points=points,
                description=project.title,
                context=f"Dept. of {problem.department}" if problem else None,
                created_at=now,
            ),
        )

    # The mentor's cut of the same award, in the same transaction. It is a
    # share of what the team earned, so it is computed from the row the database
    # just totalled — never from the components typed into the request.
    share = _mentor_share(db, project, row, now)

    # UD-1: the award is what completes a project. A revision corrects the
    # credits, not the day the work finished.
    if project.completed_at is None:
        project.completed_at = now

    record_audit(
        db,
        action="credit.revised" if previous else "credit.awarded",
        entity="credit_award",
        entity_id=str(row.id),
        actor_id=faculty.id,
        institution_id=faculty.institution_id,
        meta={
            "project_id": str(project.id),
            "total": row.total,
            "recipient_count": len(members),
            **share,
        }
        if previous is None
        else {
            "project_id": str(project.id),
            "previous_total": previous.total,
            "total": row.total,
            "delta": points,
            **share,
        },
    )

    # Telling people, in the same transaction that credited them. `points` is
    # the delta this award posted, which is what a revision actually changed —
    # the engine still owns the number, this only repeats it.
    notifications.notify_many(
        db,
        user_ids=[member.id for member in members],
        institution_id=project.institution_id,
        kind="success",
        title="Credits awarded" if previous is None else "Credits revised",
        message=f"{points:+d} credits for {project.title}.",
        entity="credit_award",
        entity_id=str(row.id),
        # A revision writes a new award row, so a corrected award notifies again.
        event_key=f"credit.award:{row.id}",
    )
    share_delta = share.get("share_delta")
    if share_delta:
        notifications.notify(
            db,
            user_id=project.mentor_id,
            institution_id=project.institution_id,
            kind="success",
            title="Mentorship credits",
            message=f"{share_delta:+d} credits for mentoring {project.title}.",
            entity="credit_award",
            entity_id=str(row.id),
            event_key=f"credit.share:{row.id}",
        )

    db.commit()
    return projects.compose_journey(db, project)


# --- rule-priced events -------------------------------------------------------------


def earn(
    db: Session,
    user: User,
    *,
    event_type: str,
    source_id: uuid.UUID,
    description: str,
    context: str | None = None,
) -> CreditTransaction | None:
    """Credit a platform event at the rate `credit_rules` says it is worth.

    The caller reports what happened and names the row it happened to; the
    engine decides the points. Nothing a request body carries can reach this
    function, so nobody prices their own work.

    Idempotent on `(user, source, source_id)`: the same event, replayed, adds
    nothing. Returns `None` when the event is unruled or already paid — an
    unpriced event is simply not worth credits, never an error.

    Joins the caller's transaction. The triggering operation still owns the
    commit, so the event and its credit land together or not at all.
    """
    rule = repo.active_rule(db, user.role, event_type, datetime.now(UTC))
    # A percentage rule prices a share of an award, which only `award()` knows.
    # There is nothing for a flat event to pay here.
    if rule is None or rule.points is None:
        return None
    source = config.EVENT_LABELS.get(event_type, event_type)
    if repo.transaction_exists(db, user_id=user.id, source=source, source_id=source_id):
        return None

    row = repo.add_transaction(
        db,
        CreditTransaction(
            institution_id=user.institution_id,
            user_id=user.id,
            source=source,
            source_id=source_id,
            points=rule.points,
            description=description,
            context=context,
        ),
    )
    record_audit(
        db,
        action="credit.earned",
        entity="credit_transaction",
        entity_id=str(row.id),
        actor_id=user.id,
        institution_id=user.institution_id,
        meta={"event_type": event_type, "points": rule.points, "source_id": str(source_id)},
    )
    # Keyed on the ledger row, which `transaction_exists` above already made
    # unique per (user, source, source_id) — so a replayed event notifies once
    # for the same reason it pays once.
    notifications.notify(
        db,
        user_id=user.id,
        institution_id=user.institution_id,
        kind="success",
        title="Credits earned",
        message=f"{rule.points:+d} credits — {context or source}: {description}.",
        entity="credit_transaction",
        entity_id=str(row.id),
        event_key=f"credit.earn:{row.id}",
    )
    return row


# --- reads ------------------------------------------------------------------------


def history(db: Session, user: User) -> list[CreditTransactionOut]:
    """The caller's own ledger, newest first. There is no other user's ledger."""
    return [
        CreditTransactionOut(
            id=row.id,
            date=row.created_at,
            source=row.source,
            points=row.points,
            description=row.description,
            context=row.context,
        )
        for row in repo.history(db, user.id)
    ]


def breakdown(db: Session, user: User) -> list[NameValueOut]:
    return [
        NameValueOut(label=source, value=int(total))
        for source, total in repo.by_source(db, user.id)
    ]


def categories(db: Session, user: User) -> list[CreditCategoryOut]:
    """The same sums as the breakdown, grouped the way the cards display them."""
    totals: dict[str, tuple[str, int]] = {}
    for source, total in repo.by_source(db, user.id):
        label, icon = config.category_of(source)
        _, running = totals.get(label, (icon, 0))
        totals[label] = (icon, running + int(total))
    return [
        CreditCategoryOut(label=label, value=value, icon=icon)
        for label, (icon, value) in sorted(
            totals.items(), key=lambda item: item[1][1], reverse=True
        )
    ]


def rules(db: Session) -> list[CreditRuleOut]:
    """The flat-priced rules — the list is "what an event is worth in credits".

    A percentage rule has no such number until an award exists, and domain.ts
    `CreditRule.points` is a required number, so the mentor's share is not a row
    on this list. It is documented in the ADR and visible where it is paid: the
    mentor's own ledger.
    """
    return [
        CreditRuleOut(
            id=rule.id,
            source=config.EVENT_LABELS.get(rule.event_type, rule.event_type),
            points=rule.points,
            description=rule.description,
        )
        for rule in repo.active_rules(db, datetime.now(UTC))
        if rule.points is not None
    ]


def pipeline(db: Session, user: User) -> list[CreditPipelineItemOut]:
    """What the caller's submissions could still earn.

    Faculty credits come from rules, not from submissions, so only a student
    has a pipeline.
    """
    if user.role is not UserRole.STUDENT:
        return []
    owned = projects_repo.list_for_student(
        db, institution_id=user.institution_id, student_id=user.id
    )
    rows = repo.pending_submissions(db, {project.id for project in owned})
    return [
        CreditPipelineItemOut(
            id=submission_id,
            title=title,
            status="In Review",
            detail=f"{projects.STAGE_NOUN[stage].capitalize()} — faculty review pending",
            potential=base_credits,
        )
        for submission_id, title, stage, _status, base_credits in rows
    ]


def summary(db: Session, user: User) -> CreditSummaryOut:
    """Balances and milestone progress, all off the one ledger."""
    current = repo.balance(db, user.id)
    level, name, next_name, milestone = config.level_of(current)
    pending = sum(item.potential for item in pipeline(db, user))
    return CreditSummaryOut(
        engine_version=config.ENGINE_VERSION,
        total=current,
        level=level,
        level_name=name,
        next_level_name=next_name,
        next_milestone=milestone,
        credits_to_next=max(milestone - current, 0),
        pct_to_next=min(round(current / milestone * 100), 100) if milestone else 100,
        current=current,
        pending=pending,
        locked=0,
        lifetime=repo.lifetime(db, user.id),
    )
