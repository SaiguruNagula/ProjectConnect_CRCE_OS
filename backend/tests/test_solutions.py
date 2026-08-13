"""The Solutions Hub: what faculty published, and where a reader can open it.

Nothing here creates a solution, because nothing can. A project reaches the hub
through the mentor's publication verb and leaves it the same way, so every
assertion checks that the hub reports the canonical state — `projects.published`
for eligibility, the approved final submission for the deployment link, the
Credit Engine for the score — and never a number or a URL of its own making.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.enums import SubmissionStage, SubmissionStatus, UserRole, UserStatus
from app.modules.projects.models import StageSubmission
from tests.conftest import auth_header, make_problem, make_user
from tests.test_credits import TOTAL, approved_project, award, publish, team_project
from tests.test_credits import seeded_rules as _seeded_rules
from tests.test_leaderboard import credit
from tests.test_portfolio import counting, make_project
from tests.test_projects import FINAL
from tests.test_reviews import EVALUATION, decide, selected_project, submit

# The Phase 5A rule table, reused as-is. Bound under its fixture name here so
# pytest finds it in this module without a second copy of the seed.
seeded_rules = _seeded_rules

# A destination a reader could actually open. Real host, from the product's own
# mock data — the hub never manufactures one. `HttpUrl` normalises a bare host
# to a root path when the team submits it, and that canonical form is what the
# hub hands back: the same string storage holds, not a rebuilt one.
LIVE_URL = "https://attendance.crce.edu.in"
STORED_URL = "https://attendance.crce.edu.in/"

SOLUTION_KEYS = {
    "id",
    "project_id",
    "name",
    "description",
    "category",
    "tags",
    "url",
    "github_url",
    "demo_url",
    "problem_id",
    "problem_title",
    "team_id",
    "mentor_name",
    "builders",
    "credits",
}


def hub(client: TestClient, viewer, **params) -> list[dict]:
    response = client.get(
        "/api/v1/solutions", params=params, headers=auth_header(client, viewer.email)
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def stats(client: TestClient, viewer) -> dict:
    response = client.get("/api/v1/solutions/stats", headers=auth_header(client, viewer.email))
    assert response.status_code == 200, response.text
    return response.json()["data"]


def submit_final(client: TestClient, student, project_id: str, **extra):
    return client.put(
        f"/api/v1/projects/{project_id}/final?submit=true",
        json=FINAL | extra,
        headers=auth_header(client, student.email),
    )


def deployed(client, student, faculty, problem, *, live_url: str | None = LIVE_URL) -> str:
    """The whole lifecycle: applied, reviewed, approved, published, live."""
    project_id = selected_project(client, student, faculty, problem)
    extra = {"live_url": live_url} if live_url else {}
    assert submit_final(client, student, project_id, **extra).status_code == 200
    decision = decide(
        client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION
    )
    assert decision.status_code == 200, decision.text
    assert publish(client, faculty, project_id).status_code == 200
    return project_id


def final_payload(db: Session, project_id, payload: dict) -> None:
    """A final submission written straight to JSONB, bypassing the request schema.

    The only way to prove the read path defends itself: `HttpUrl` already
    refuses anything but http(s) at the boundary, so a hostile value can only
    arrive through storage.
    """
    db.add(
        StageSubmission(
            project_id=project_id,
            stage=SubmissionStage.FINAL,
            status=SubmissionStatus.APPROVED,
            payload=payload,
        )
    )
    db.flush()


# --- authorization ------------------------------------------------------------------


def test_the_hub_is_closed_to_anonymous_callers(client: TestClient) -> None:
    for path in ("/api/v1/solutions", "/api/v1/solutions/stats"):
        response = client.get(path)
        assert response.status_code == 401
        assert response.json()["error_code"] == "UNAUTHENTICATED"


def test_a_suspended_user_loses_the_hub(client: TestClient, db: Session, student) -> None:
    headers = auth_header(client, student.email)
    student.status = UserStatus.SUSPENDED
    db.flush()

    assert client.get("/api/v1/solutions", headers=headers).status_code == 401


def test_every_role_reads_the_same_hub(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    """Discovery is for the whole campus — nobody's shelf is different."""
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    admin = make_user(db, institution=institution_a, email="admin@crce.edu", role=UserRole.ADMIN)
    principal = make_user(
        db, institution=institution_a, email="principal@crce.edu", role=UserRole.PRINCIPAL
    )

    readers = (student, faculty, admin, principal)
    seen = [[s["id"] for s in hub(client, viewer)] for viewer in readers]

    assert len({tuple(ids) for ids in seen}) == 1
    assert len(seen[0]) == 1


def test_the_hub_has_no_write_verbs(client: TestClient, student) -> None:
    """Publication is a verb on a project. A second one here would be a second lifecycle."""
    headers = auth_header(client, student.email)
    for method in ("POST", "PUT", "PATCH", "DELETE"):
        response = client.request(method, "/api/v1/solutions", headers=headers)
        assert response.status_code == 405, method


def test_the_forbidden_solution_routes_do_not_exist(client: TestClient, student) -> None:
    headers = auth_header(client, student.email)
    for path in ("publish", "refresh", "rebuild", "recalculate", "feature"):
        assert client.post(f"/api/v1/solutions/{path}", headers=headers, json={}).status_code == 404
    for path in (str(uuid.uuid4()), "search", "featured"):
        assert client.get(f"/api/v1/solutions/{path}", headers=headers).status_code == 404


# --- tenancy ------------------------------------------------------------------------


def test_another_colleges_solution_is_not_on_the_shelf(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    outsider = make_user(
        db, institution=institution_b, email="rhea.menon@other.edu", role=UserRole.FACULTY
    )
    outside_problem = make_problem(db, institution=institution_b, author=outsider)
    make_project(
        db, problem=outside_problem, mentor=outsider, published=True, title="Their solution"
    )

    ours = hub(client, student)
    theirs = hub(client, outsider)

    assert [s["name"] for s in ours] == ["Campus navigation"]
    assert [s["name"] for s in theirs] == ["Their solution"]


def test_the_hub_takes_no_institution_from_the_caller(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    outsider = make_user(
        db, institution=institution_b, email="kabir.shah@other.edu", role=UserRole.FACULTY
    )
    outside_problem = make_problem(db, institution=institution_b, author=outsider)
    make_project(db, problem=outside_problem, mentor=outsider, published=True)

    spoofed = hub(
        client,
        student,
        institution_id=str(institution_b.id),
        college_id=str(institution_b.id),
    )

    assert spoofed == []


# --- what reaches the shelf ---------------------------------------------------------


def test_a_published_project_is_a_solution(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project = make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    listed = hub(client, student)

    assert [s["id"] for s in listed] == [str(project.id)]
    assert set(listed[0]) == SOLUTION_KEYS


def test_an_unpublished_project_is_not_a_solution(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student)

    assert hub(client, student) == []


def test_an_approved_project_reaches_the_shelf_only_when_faculty_publish_it(
    client: TestClient, student, faculty, problem
) -> None:
    """Approval finishes the review. Publication is a separate, human decision."""
    project_id = approved_project(client, student, faculty, problem)

    assert hub(client, student) == []

    assert publish(client, faculty, project_id).status_code == 200
    assert [s["id"] for s in hub(client, student)] == [project_id]


def test_unpublishing_takes_the_solution_off_the_shelf(
    client: TestClient, student, faculty, problem
) -> None:
    """The hub caches nothing, so the canonical flag is obeyed on the next read."""
    project_id = deployed(client, student, faculty, problem)

    assert len(hub(client, student)) == 1

    assert publish(client, faculty, project_id, publish=False).status_code == 200
    assert hub(client, student) == []


def test_a_deleted_project_is_not_a_solution(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    project = make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    project.deleted_at = datetime.now(UTC)
    db.flush()

    assert hub(client, student) == []
    assert stats(client, student)["live_solutions"] == 0


def test_a_student_cannot_publish_their_own_project(
    client: TestClient, student, faculty, problem
) -> None:
    project_id = approved_project(client, student, faculty, problem)

    response = client.post(
        f"/api/v1/projects/{project_id}/publication",
        json={"publish": True},
        headers=auth_header(client, student.email),
    )

    assert response.status_code == 403
    assert hub(client, student) == []


def test_an_empty_hub_is_a_hub(client: TestClient, student) -> None:
    assert hub(client, student) == []
    assert stats(client, student) == {
        "live_solutions": 0,
        "contributors": 0,
        "departments": 0,
    }


def test_a_solution_appears_once(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    """Four outer joins, one row: the card must not be dealt twice."""
    project_id = deployed(client, student, faculty, problem)
    final_ids = [s["id"] for s in hub(client, student)]

    assert final_ids == [project_id]
    assert len(final_ids) == len(set(final_ids))


def test_several_solutions_share_the_shelf(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    for index in range(3):
        extra = make_problem(db, institution=institution_a, author=faculty, title=f"P{index}")
        make_project(
            db, problem=extra, mentor=faculty, student=student, published=True, title=f"S{index}"
        )

    assert sorted(s["name"] for s in hub(client, student)) == ["S0", "S1", "S2"]


# --- the deployment destination -----------------------------------------------------


def test_the_live_url_is_the_one_the_team_submitted(
    client: TestClient, student, faculty, problem
) -> None:
    """Backend data, byte for byte. The frontend has nothing left to construct."""
    deployed(client, student, faculty, problem)

    solution = hub(client, student)[0]

    assert solution["url"] == STORED_URL
    assert solution["github_url"] == FINAL["github_url"]


def test_a_dangerous_scheme_never_reaches_the_final_submission(
    client: TestClient, student, faculty, problem
) -> None:
    """`HttpUrl` is the trust boundary; the hub is never asked to clean up after it."""
    project_id = selected_project(client, student, faculty, problem)

    for hostile in (
        "javascript:alert(document.cookie)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "file:///etc/passwd",
        "ftp://files.crce.edu.in/app",
        "not a url at all",
    ):
        response = submit_final(client, student, project_id, live_url=hostile)
        assert response.status_code == 422, hostile
        assert response.json()["error_code"] == "VALIDATION_ERROR"


def test_a_hostile_url_already_in_storage_is_not_served(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """JSONB is untyped storage, so the read path checks the scheme again."""
    project = make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    final_payload(
        db,
        project.id,
        {"live_url": "javascript:alert(1)", "github_url": "JavaScript:alert(1)", "tech_stack": []},
    )

    solution = hub(client, student)[0]

    assert solution["url"] is None
    assert solution["github_url"] is None


def test_a_published_project_without_a_deployment_still_lists(
    client: TestClient, student, faculty, problem
) -> None:
    """`live_url` is optional on the final stage. A null link is honest; a fake
    one is not — the card then routes to the project space instead."""
    project_id = deployed(client, student, faculty, problem, live_url=None)

    solution = hub(client, student)[0]

    assert solution["id"] == project_id
    assert solution["url"] is None


def test_the_hub_invents_no_destination(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    solution = hub(client, student)[0]

    assert (solution["url"], solution["github_url"], solution["demo_url"]) == (None, None, None)


# --- what a card says ---------------------------------------------------------------


def test_the_solution_is_the_project(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """One identity all the way through: no second entity, no second id."""
    project = make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    solution = hub(client, student)[0]

    assert solution["id"] == solution["project_id"] == str(project.id)
    assert solution["name"] == project.title
    assert solution["description"] == project.summary
    assert solution["mentor_name"] == faculty.name


def test_a_solution_keeps_the_problem_it_answers(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    solution = hub(client, student)[0]

    assert solution["problem_id"] == str(problem.id)
    assert solution["problem_title"] == problem.title
    # The category is the problem's department — real data, not a coined label.
    assert solution["category"] == problem.department


def test_the_tags_are_the_stack_the_team_shipped(
    client: TestClient, student, faculty, problem
) -> None:
    deployed(client, student, faculty, problem)

    assert hub(client, student)[0]["tags"] == FINAL["tech_stack"]


def test_a_solo_solution_credits_the_student_who_built_it(
    client: TestClient, student, faculty, problem
) -> None:
    deployed(client, student, faculty, problem)

    solution = hub(client, student)[0]

    assert [b["name"] for b in solution["builders"]] == [student.name]
    assert solution["team_id"] is None


def test_a_team_solution_lists_every_builder_once(
    client: TestClient, student, other_student, faculty, problem
) -> None:
    project_id = team_project(client, student, other_student, problem)
    submit(client, student, project_id, SubmissionStage.IDEA)
    decide(client, faculty, project_id, SubmissionStage.IDEA, "approve")
    submit(client, student, project_id, SubmissionStage.POC)
    decide(client, faculty, project_id, SubmissionStage.POC, "select")
    assert submit_final(client, student, project_id, live_url=LIVE_URL).status_code == 200
    decide(client, faculty, project_id, SubmissionStage.FINAL, "approve", evaluation=EVALUATION)
    publish(client, faculty, project_id)

    solution = hub(client, student)[0]
    names = [b["name"] for b in solution["builders"]]

    assert sorted(names) == sorted([student.name, other_student.name])
    assert len(names) == len(set(names))
    assert solution["team_id"] is not None


# --- the Credit Engine owns the number ----------------------------------------------


def test_the_credits_on_a_card_are_the_credit_engines_award(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    project_id = deployed(client, student, faculty, problem)
    assert award(client, faculty, project_id).status_code == 200

    assert hub(client, student)[0]["credits"] == TOTAL


def test_an_unscored_solution_reports_no_credits(
    client: TestClient, student, faculty, problem
) -> None:
    """Publication awards nothing, so the field is null rather than zero."""
    deployed(client, student, faculty, problem)

    assert hub(client, student)[0]["credits"] is None


def test_the_hub_has_no_score_of_its_own(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """No rating, no ranking, no popularity — one economy, and it is elsewhere."""
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    solution = hub(client, student)[0]

    assert not {key for key in solution if "score" in key or "rank" in key or "rating" in key}


def test_reading_the_hub_writes_nothing(
    client: TestClient, student, faculty, problem, seeded_rules
) -> None:
    project_id = deployed(client, student, faculty, problem)
    award(client, faculty, project_id)

    for _ in range(3):
        hub(client, student)
        stats(client, student)

    summary = client.get(
        "/api/v1/credits/summary", headers=auth_header(client, student.email)
    ).json()["data"]
    assert summary["total"] == TOTAL


# --- the headline counters ----------------------------------------------------------


def test_the_counters_are_the_whole_shelf(
    client: TestClient, db: Session, institution_a, student, other_student, faculty, problem
) -> None:
    second = make_problem(
        db, institution=institution_a, author=faculty, title="Lab booking", department="IT"
    )
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    make_project(db, problem=second, mentor=faculty, student=other_student, published=True)

    assert stats(client, student) == {
        "live_solutions": 2,
        "contributors": 2,
        "departments": 2,
    }


def test_a_builder_of_two_solutions_is_one_contributor(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    second = make_problem(db, institution=institution_a, author=faculty, title="Lab booking")
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    make_project(db, problem=second, mentor=faculty, student=student, published=True)

    assert stats(client, student)["contributors"] == 1


def test_the_counters_stop_at_the_institution_boundary(
    client: TestClient, db: Session, institution_b, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)
    outsider = make_user(
        db, institution=institution_b, email="dev.iyer@other.edu", role=UserRole.FACULTY
    )
    outside_problem = make_problem(db, institution=institution_b, author=outsider)
    make_project(db, problem=outside_problem, mentor=outsider, published=True)

    assert stats(client, student)["live_solutions"] == 1
    assert stats(client, outsider)["live_solutions"] == 1


# --- the rest of the product --------------------------------------------------------


def test_a_published_solution_counts_on_the_problem_it_answers(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    """The catalog's `solutionsCount` is the same eligibility rule, one query over."""
    before = client.get("/api/v1/problems", headers=auth_header(client, student.email))
    assert before.json()["data"]["items"][0]["solutions_count"] == 0

    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    after = client.get("/api/v1/problems", headers=auth_header(client, student.email))
    assert after.json()["data"]["items"][0]["solutions_count"] == 1


def test_the_hub_and_the_portfolio_agree(
    client: TestClient, db: Session, student, faculty, problem
) -> None:
    make_project(db, problem=problem, mentor=faculty, student=student, published=True)

    portfolio = client.get(
        "/api/v1/portfolio/me", headers=auth_header(client, student.email)
    ).json()["data"]

    assert portfolio["stats"]["verified_solutions"] == len(hub(client, student)) == 1


def test_publishing_moves_nobody_on_the_leaderboard(
    client: TestClient, db: Session, student, other_student, faculty, problem
) -> None:
    """Ranking is the leaderboard's, and it reads the ledger — not the shelf."""
    credit(db, other_student, 400)
    before = client.get(
        "/api/v1/leaderboard/students", headers=auth_header(client, student.email)
    ).json()["data"]

    deployed(client, student, faculty, problem)

    after = client.get(
        "/api/v1/leaderboard/students", headers=auth_header(client, student.email)
    ).json()["data"]
    assert after == before


# --- query cost ---------------------------------------------------------------------


def test_more_solutions_do_not_mean_more_queries(
    client: TestClient, db: Session, institution_a, student, faculty, problem
) -> None:
    headers = auth_header(client, student.email)
    make_project(db, problem=problem, mentor=faculty, student=student, published=True, title="One")

    with counting(db) as first:
        client.get("/api/v1/solutions", headers=headers)

    for index in range(2, 6):
        extra = make_problem(db, institution=institution_a, author=faculty, title=f"P{index}")
        make_project(
            db, problem=extra, mentor=faculty, student=student, published=True, title=f"No {index}"
        )

    with counting(db) as fifth:
        page = client.get("/api/v1/solutions", headers=headers)

    assert len(page.json()["data"]) == 5
    assert len(fifth) == len(first)
