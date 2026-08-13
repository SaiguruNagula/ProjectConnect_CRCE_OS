"""Problem catalog and suggestion business rules.

Every guard here is the mock repository's guard (repositories/mock/index.ts),
restated server-side: the frontend is the product contract, not the enforcement
point. Derived values — team counts, applicant counts, the timeline, the weeks
figure — are computed on read and never accepted from a client.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.enums import (
    ProblemStatus,
    ProblemSuggestionStatus,
    UserRole,
    UserStatus,
)
from app.common.errors import BusinessRuleError, NotFoundError, ValidationError
from app.core import authorize
from app.modules.credits import service as credits
from app.modules.problems import repository as repo
from app.modules.problems.models import Problem, ProblemDraft, ProblemSuggestion
from app.modules.problems.schemas import (
    MentorOption,
    ProblemCatalogPage,
    ProblemCatalogStats,
    ProblemCreate,
    ProblemDraftOut,
    ProblemMilestone,
    ProblemOut,
    ProblemSuggestionInput,
    ProblemSuggestionOut,
    SuggestionDecisionInput,
)
from app.modules.users.models import User

# Defaults a mentor-approved suggestion inherits, from the mock's
# `problemFromSuggestion`. A suggestion carries no scheduling detail, so the
# published problem gets the standard one-term window.
SUGGESTION_DEFAULT_DIFFICULTY = "Intermediate"
SUGGESTION_DEFAULT_TEAM_SIZE = 4
SUGGESTION_DEFAULT_CREDITS = 200
SUGGESTION_DEFAULT_WINDOW_DAYS = 84

EDITABLE_SUGGESTION_STATUSES = (
    ProblemSuggestionStatus.DRAFT,
    ProblemSuggestionStatus.CHANGES_REQUESTED,
)


def _timeline(problem: Problem, today: date) -> list[ProblemMilestone]:
    """The two milestones `composeProblem` builds from the problem's dates."""
    return [
        ProblemMilestone(
            label="Registration Open",
            date=problem.start_date.isoformat(),
            done=problem.start_date <= today,
        ),
        ProblemMilestone(
            label="Final Submission",
            date=problem.end_date.isoformat(),
            done=problem.end_date < today,
        ),
    ]


def _timeline_weeks(problem: Problem) -> int:
    span = (problem.end_date - problem.start_date).days
    return max(1, round(span / 7))


def _to_out(row: repo.CatalogRow) -> ProblemOut:
    problem = row.problem
    return ProblemOut(
        id=problem.id,
        title=problem.title,
        summary=problem.summary,
        department=problem.department,
        difficulty=problem.difficulty,
        skills=problem.required_skills,
        faculty_name=row.faculty_name,
        faculty_id=problem.created_by,
        team_size=problem.team_size,
        # Teams formed on the problem — the figure the catalog and the faculty
        # dashboard both count (mock `stats.teams` counts problems having one).
        current_team_count=row.team_count,
        timeline_weeks=_timeline_weeks(problem),
        credit_reward=problem.base_credits,
        applicants_count=row.applicants_count,
        # Solutions Hub is Phase 5; the field is optional in the contract.
        solutions_count=None,
        end_date=problem.end_date,
        attachments=problem.attachments,
        timeline=_timeline(problem, datetime.now(UTC).date()),
        status=problem.status,
        bookmarked=row.bookmarked,
        application_status=(
            "none" if not row.applied else ("team" if row.application_team_id else "solo")
        ),
    )


def catalog(
    db: Session,
    viewer: User,
    *,
    page: int,
    limit: int,
    search: str | None,
    department: str | None,
    saved_only: bool,
    sort: str | None,
) -> ProblemCatalogPage:
    rows, total, served_page, total_pages = repo.catalog_page(
        db,
        institution_id=viewer.institution_id,
        viewer_id=viewer.id,
        page=page,
        limit=limit,
        search=search,
        department=department,
        saved_only=saved_only,
        sort=sort,
    )
    stats = repo.stats(db, viewer.institution_id)
    return ProblemCatalogPage(
        items=[_to_out(row) for row in rows],
        page=served_page,
        limit=limit,
        total=total,
        total_pages=total_pages,
        # Facets describe the whole catalog: filtering by department must not
        # erase the chip needed to undo the filter.
        departments=repo.departments(db, viewer.institution_id),
        stats=ProblemCatalogStats(
            problems=stats.problems, departments=stats.departments, teams=stats.teams
        ),
    )


def detail(db: Session, viewer: User, problem_id: uuid.UUID) -> ProblemOut:
    row = repo.get_row(
        db, problem_id, institution_id=viewer.institution_id, viewer_id=viewer.id
    )
    if row is None:
        raise NotFoundError("Problem not found.")
    return _to_out(row)


def _credit_publication(db: Session, author: User, problem: Problem) -> None:
    """Publishing is a faculty event; the Credit Engine prices it (ADR-5).

    Keyed on the problem id, so re-running this for a problem already in the
    catalog credits nobody a second time.
    """
    credits.earn(
        db,
        author,
        event_type="PROBLEM_PUBLISHED",
        source_id=problem.id,
        description=problem.title,
        context=f"Dept. of {problem.department}",
    )


def create(db: Session, author: User, payload: ProblemCreate) -> ProblemOut:
    problem = repo.add(
        db,
        Problem(
            institution_id=author.institution_id,
            created_by=author.id,
            title=payload.title.strip(),
            summary=payload.summary.strip(),
            statement=payload.statement.strip(),
            current_challenge=payload.current_challenge,
            expected_impact=payload.expected_impact,
            department=payload.department.strip(),
            difficulty=payload.difficulty,
            required_skills=payload.skills,
            tools=payload.tools,
            team_size=payload.team_size,
            allow_individual=payload.allow_individual_entry,
            start_date=payload.registration_date,
            end_date=payload.deadline_date,
            base_credits=payload.base_credits,
            # ADR-10: publishing opens the problem. Nothing moves it on afterwards.
            status=ProblemStatus.OPEN,
            attachments=[],
        ),
    )
    record_audit(
        db,
        action="problem.created",
        entity="problem",
        entity_id=str(problem.id),
        actor_id=author.id,
        institution_id=author.institution_id,
        meta={"department": problem.department},
    )
    _credit_publication(db, author, problem)
    db.commit()
    return detail(db, author, problem.id)


def save_draft(db: Session, author: User, payload: ProblemCreate) -> ProblemDraftOut:
    draft = repo.add_draft(
        db,
        ProblemDraft(
            institution_id=author.institution_id,
            created_by=author.id,
            payload=payload.model_dump(mode="json"),
        ),
    )
    record_audit(
        db,
        action="problem.draft_saved",
        entity="problem_draft",
        entity_id=str(draft.id),
        actor_id=author.id,
        institution_id=author.institution_id,
    )
    db.commit()
    return ProblemDraftOut(id=draft.id, saved_at=draft.updated_at, input=draft.payload)


def list_drafts(db: Session, author: User) -> list[ProblemDraftOut]:
    return [
        ProblemDraftOut(id=draft.id, saved_at=draft.updated_at, input=draft.payload)
        for draft in repo.list_drafts(
            db, institution_id=author.institution_id, author_id=author.id
        )
    ]


def set_bookmark(
    db: Session, student: User, problem_id: uuid.UUID, *, bookmarked: bool
) -> ProblemOut:
    problem = repo.get(db, problem_id, institution_id=student.institution_id)
    if problem is None:
        raise NotFoundError("Problem not found.")

    existing = repo.get_bookmark(db, student_id=student.id, problem_id=problem_id)
    if bookmarked and existing is None:
        repo.add_bookmark(db, student_id=student.id, problem_id=problem_id)
    elif not bookmarked and existing is not None:
        repo.remove_bookmark(db, existing)
    db.commit()
    return detail(db, student, problem_id)


def mentors(db: Session, viewer: User) -> list[MentorOption]:
    return [
        MentorOption(id=mentor.id, name=mentor.name)
        for mentor in repo.list_mentors(db, viewer.institution_id)
    ]


# --- suggestions --------------------------------------------------------------


def _suggestion_out(
    suggestion: ProblemSuggestion, *, mentor_name: str, author_name: str
) -> ProblemSuggestionOut:
    return ProblemSuggestionOut(
        id=suggestion.id,
        status=suggestion.status,
        input=ProblemSuggestionInput(
            title=suggestion.title,
            description=suggestion.description,
            category=suggestion.category,
            importance=suggestion.importance,
            expected_impact=suggestion.expected_impact,
            mentor_id=suggestion.mentor_id,
            reference_links=suggestion.reference_links,
        ),
        mentor_name=mentor_name,
        submitted_by=author_name,
        submitted_at=suggestion.submitted_at or suggestion.created_at,
        reviewed_at=suggestion.reviewed_at,
        mentor_feedback=suggestion.mentor_feedback,
        published_problem_id=suggestion.published_problem_id,
    )


def list_suggestions(db: Session, viewer: User) -> list[ProblemSuggestionOut]:
    """Students see their own; faculty see the ones nominating them."""
    if viewer.role is UserRole.FACULTY:
        rows = repo.list_suggestions_for_mentor(
            db, institution_id=viewer.institution_id, mentor_id=viewer.id
        )
    else:
        rows = repo.list_suggestions_for_student(
            db, institution_id=viewer.institution_id, student_id=viewer.id
        )
    names = repo.names_by_id(
        db, {row.mentor_id for row in rows} | {row.student_id for row in rows}
    )
    return [
        _suggestion_out(
            row,
            mentor_name=names.get(row.mentor_id, ""),
            author_name=names.get(row.student_id, ""),
        )
        for row in rows
    ]


def _resolve_mentor(db: Session, student: User, mentor_id: uuid.UUID) -> User:
    mentor = db.get(User, mentor_id)
    if (
        mentor is None
        or not authorize.same_institution(student, mentor)
        or mentor.role is not UserRole.FACULTY
        or mentor.status is not UserStatus.ACTIVE
        or mentor.deleted_at is not None
    ):
        raise ValidationError("Select a mentor to review your suggestion.")
    return mentor


def save_suggestion(
    db: Session,
    student: User,
    payload: ProblemSuggestionInput,
    *,
    submit: bool,
    suggestion_id: uuid.UUID | None = None,
) -> ProblemSuggestionOut:
    mentor = _resolve_mentor(db, student, payload.mentor_id)

    suggestion = None
    if suggestion_id is not None:
        suggestion = repo.get_suggestion(
            db, suggestion_id, institution_id=student.institution_id
        )
        if suggestion is None:
            raise NotFoundError("Suggestion not found.")
        authorize.ensure(
            suggestion.student_id == student.id,
            "You do not have permission to perform this action.",
        )
        if suggestion.status not in EDITABLE_SUGGESTION_STATUSES:
            raise BusinessRuleError("This suggestion is already with your mentor.")

    now = datetime.now(UTC)
    if suggestion is None:
        suggestion = repo.add_suggestion(
            db,
            ProblemSuggestion(
                institution_id=student.institution_id,
                student_id=student.id,
                mentor_id=mentor.id,
                title=payload.title.strip(),
                description=payload.description.strip(),
                category=payload.category.strip(),
                importance=payload.importance.strip(),
                expected_impact=payload.expected_impact.strip(),
                reference_links=[str(link) for link in payload.reference_links],
                status=ProblemSuggestionStatus.DRAFT,
            ),
        )
    else:
        suggestion.mentor_id = mentor.id
        suggestion.title = payload.title.strip()
        suggestion.description = payload.description.strip()
        suggestion.category = payload.category.strip()
        suggestion.importance = payload.importance.strip()
        suggestion.expected_impact = payload.expected_impact.strip()
        suggestion.reference_links = [str(link) for link in payload.reference_links]

    if submit:
        # A suggestion never publishes itself: submitting only queues review.
        suggestion.status = ProblemSuggestionStatus.PENDING_MENTOR_REVIEW
        suggestion.submitted_at = now
        suggestion.mentor_feedback = None
    else:
        suggestion.status = ProblemSuggestionStatus.DRAFT

    record_audit(
        db,
        action="suggestion.submitted" if submit else "suggestion.saved",
        entity="problem_suggestion",
        entity_id=str(suggestion.id),
        actor_id=student.id,
        institution_id=student.institution_id,
        meta={"mentor_id": str(mentor.id)},
    )
    db.commit()
    return _suggestion_out(suggestion, mentor_name=mentor.name, author_name=student.name)


def _problem_from_suggestion(suggestion: ProblemSuggestion, mentor: User) -> Problem:
    today = datetime.now(UTC).date()
    return Problem(
        institution_id=suggestion.institution_id,
        # The nominated mentor becomes the problem's faculty owner.
        created_by=mentor.id,
        title=suggestion.title,
        summary=suggestion.description,
        statement=suggestion.description,
        current_challenge=suggestion.importance,
        expected_impact=suggestion.expected_impact,
        department=suggestion.category,
        difficulty=SUGGESTION_DEFAULT_DIFFICULTY,
        required_skills=[],
        tools=[],
        team_size=SUGGESTION_DEFAULT_TEAM_SIZE,
        allow_individual=True,
        start_date=today,
        end_date=today + timedelta(days=SUGGESTION_DEFAULT_WINDOW_DAYS),
        base_credits=SUGGESTION_DEFAULT_CREDITS,
        status=ProblemStatus.OPEN,
        suggestion_id=suggestion.id,
        attachments=[
            {"name": f"Reference {index + 1}", "type": "Link", "url": url}
            for index, url in enumerate(suggestion.reference_links)
        ],
    )


def decide_suggestion(
    db: Session, mentor: User, suggestion_id: uuid.UUID, payload: SuggestionDecisionInput
) -> ProblemSuggestionOut:
    suggestion = repo.get_suggestion(
        db, suggestion_id, institution_id=mentor.institution_id
    )
    if suggestion is None:
        raise NotFoundError("Suggestion not found.")
    authorize.ensure(
        authorize.is_nominated_mentor(mentor, suggestion),
        "Only the nominated mentor can decide this suggestion.",
    )
    if suggestion.status is not ProblemSuggestionStatus.PENDING_MENTOR_REVIEW:
        raise BusinessRuleError("This suggestion is not awaiting review.")

    approved = payload.decision == "approved"
    feedback = payload.feedback.strip()
    if not approved and not feedback:
        raise ValidationError("Explain what the student should change.")

    published: Problem | None = None
    if approved:
        # Approval is the only path from a suggestion into the public catalog,
        # and it publishes the problem in the same transaction as the decision.
        published = repo.add(db, _problem_from_suggestion(suggestion, mentor))
        suggestion.published_problem_id = published.id
        suggestion.status = ProblemSuggestionStatus.PUBLISHED
        _credit_publication(db, mentor, published)
    else:
        suggestion.status = ProblemSuggestionStatus(payload.decision)

    suggestion.reviewed_at = datetime.now(UTC)
    suggestion.mentor_feedback = feedback or None

    record_audit(
        db,
        action="suggestion.decided",
        entity="problem_suggestion",
        entity_id=str(suggestion.id),
        actor_id=mentor.id,
        institution_id=mentor.institution_id,
        meta={
            "decision": payload.decision,
            "published_problem_id": str(published.id) if published else None,
        },
    )
    db.commit()

    author = db.get(User, suggestion.student_id)
    return _suggestion_out(
        suggestion,
        mentor_name=mentor.name,
        author_name=author.name if author else "",
    )
