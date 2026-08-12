# ProjectConnect OS Backend Architecture

**Status:** FROZEN — implementation contract for backend v1. All five ADRs are resolved (ACCEPTED, see §47 and DECISIONS.md §15). No unresolved architectural decisions remain.
**Source of truth:** the frontend frozen at tag `v1.0-frontend-freeze` (commit `7a2934f`, merged to `main` at `07ed761`)
**Audience:** Claude Opus (implementing model), engineering team
**Date:** 2026-08-11
**Note:** the backend is greenfield — nothing described here exists yet. Every capability in this document is a requirement to build, never a claim of what has been built.

---

## 1. Executive Summary

ProjectConnect OS is an engineering-college operating platform: students build,
faculty guide, institutions measure. The production frontend is complete, frozen
on `main`, and runs entirely on mock repositories. The backend to build is a
**FastAPI + PostgreSQL + SQLAlchemy + Alembic modular monolith** that satisfies
the repository interfaces the frontend already defines.

The single most important fact of this audit: **the frontend already contains
its own backend contract.** Three files are canonical:

| File | What it defines |
|---|---|
| `frontend/app/src/types/domain.ts` | Every domain model, status vocabulary, and request/response payload |
| `frontend/app/src/repositories/types.ts` | The 13 repository interfaces = the API surface |
| `frontend/app/src/repositories/mock/index.ts` | Per-method endpoint annotations **and the business rules/guards the backend must enforce** |

The mock repository is a reference implementation of the business logic:
stage-gating, lead-only team management, suggestion lifecycle, review decision
rules, credit-award preconditions. Port those rules to the server; do not
re-derive them from older documents.

Several existing docs (DATABASE_SCHEMA.md, API_SPEC.md, Migration_Map.md) predate
the four-stage submission journey and are **stale in specific, identified ways**
(§4). Where they conflict with the frontend, the frontend wins.

---

## 2. Repository Audit

Audited at `main` = `07ed761` (clean tree).

```
frontend/app/          Production React 19 + Vite + TS app (the product contract)
frontend/<80+ dirs>    Stitch HTML prototypes — design references only, NOT product
backend/               EMPTY — nothing exists
infrastructure/        EMPTY
scripts/               EMPTY
docker-compose.yml     EMPTY (0 bytes)
docs/                  10 documents, reconciled in §4
```

- No backend code, no models, no migrations, no scaffolding exists. Greenfield.
- Frontend verifies green: `npm run build`, `typecheck`, `lint` all pass.
- Frontend stack: React 19, react-router 7, react-hook-form + zod 4, Tailwind 3.
  `api/client.ts` already implements the transport contract (envelope, JWT
  bearer, error body, pagination query) — the backend must match it exactly (§28).

---

## 3. Current Frontend Reality

### Routes (from `routes/AppRouter.tsx` + `constants/routes.ts`)

| Route | Layout | Guard | Page |
|---|---|---|---|
| `/` | Public | none | LandingPage |
| `/about` | Public | none | AboutPage |
| `/login` | Public | none | LoginPage (demo role-picker; no password) |
| `/innovation-hub` | Public | none | InnovationHubPage |
| `/open-problems` | Public | none | OpenProblemsPage (paged catalog) |
| `/problem/:id` | Public | none | ProblemDetailsPage |
| `/team` | Public | none | TeamFormationPage (`?problem=` scoping) |
| `/review` | Public | none | ReviewEnginePage (renders per-role view) |
| `/solutions` | Public | none | SolutionsHubPage |
| `/leaderboard` | Public | none | LeaderboardPage (student/faculty toggle) |
| `/portfolio/:id` | Public | none | PortfolioPage (`me` = owner view) |
| `/credits` | Public | — | redirect → `/student/credits` |
| `/student/{dashboard,projects,projects/:id,credits,profile}` | Student | `role=student` | Student workspace; `projects/:id` = **ProjectSubmissionsPage** (4-stage journey) |
| `/faculty/{dashboard,create-problem,review,profile}` | Faculty | `role=faculty` | Faculty workspace |
| `/admin/{dashboard,users,institutions}` | Admin | `role=admin` | Admin consoles |
| `/principal/{dashboard,analytics}` | Principal | `role=principal` | Executive views |

There is **no** `/project` workspace route, **no** task board, **no** kanban,
**no** milestones UI. `ProjectWorkspacePage` was deleted in the freeze commit.

### Roles
Exactly four: `student | faculty | admin | principal` (`types/index.ts`).
`ProtectedRoute` gates by single role. Demo auth (`AuthProvider`) stores a chosen
demo user in localStorage — **the only real-auth seam is `AuthProvider.login`
plus the token push into `api/client.ts`**.

### Key facts the backend must respect

- **All submission evidence is link-based.** `IdeaSubmission`, `PocSubmission`,
  `FinalSubmission` carry URLs (`githubUrl`, `presentationUrl`, `screenshots:
  string[]`, `documents: string[]`). There is **no file upload input anywhere**
  in the frontend. No avatar upload either — avatars are `avatarInitials`
  strings. v1 needs **no file storage service** (§27).
- **Server-side pagination** is already the contract for the problem catalog
  (`Paginated<T>`, `ProblemCatalogPage` with facets + stats computed over the
  whole result set, not the page).
- **Read models are composed server-side.** `ProjectJourney`, `ReviewQueues`,
  `Portfolio`, `InstitutionAnalytics`, `AdminDashboardData` are aggregates the
  UI renders verbatim. The frontend never derives a status, a permission
  (`Team.canManage`), or a stat.
- **Notifications are raised by mutations**, server-side, with an in-app `link`
  built from route constants. Every mutation in the mock calls `raise(...)` —
  the backend mirrors this (§25).
- **CSV export is client-side** (`utils/csv.ts`) over rows already loaded. No
  reporting endpoint is required for v1.

---

## 4. Existing Documentation Reconciliation

Priority order applied: frontend implementation > backend (none) > schema (none)
> architecture/API/DB docs > PRD/TRD > assumptions.

| Document | Status | What remains valid | What is stale / wrong |
|---|---|---|---|
| `DECISIONS.md` | **Mostly valid — treat as canonical for decisions** | JWT+refresh, bcrypt, RBAC (4 roles), backend-enforced authz, REST `/api/v1`, envelope format, modular monolith, repository pattern, soft deletes, UUIDs, Credit Engine as sole scorer, Leaderboard displays only, Portfolio auto-generated + verified, credits only on faculty approval, shared modules role-agnostic, light-theme-only v1 | Nothing materially — this doc aged best |
| `DATABASE_SCHEMA.md` | **Stale in the Project/Review/Portfolio domains** | Naming conventions, constraint/index philosophy, auth tables, users/departments/problems/teams table shapes (minor field diffs), credit tables, notification table | `project_tasks`, `project_files`, `project_milestones` — **delete; no such features exist**. `reviews`/`review_rubrics`/`review_history` — replaced by stage-based submissions+reviews (§12). `portfolio_entries`/`portfolio_exports` — portfolio is *composed*, not row-entered; replaced by `portfolio_customizations`. **Missing entirely:** `institutions` (marked "future" but the Admin Institutions console exists NOW), `problem_suggestions`, `applications`, `stage_submissions`, `credit_awards`, `solutions` |
| `API_SPEC.md` | **Transport standards valid; endpoint catalog partially stale** | Base URL `/api/v1`, success/error envelopes, status codes, pagination meta, auth APIs, most problem/team APIs | Project APIs (`Upload Project File`, `Add/Update Milestone`) — stale. Review APIs (single-review `Submit/Update Review`) — replaced by stage decisions. `Upload Avatar`, `Upload Resources` — no frontend consumer in v1. `Export Portfolio` — client-side now |
| `ARCHITECTURE.md` | **Valid as philosophy** | Modular monolith, layers, event flow, data-flows-not-re-entered, shared services | "Project Workspace" as a shared module — now "Project Submissions" (4-stage journey). Folder sketch is generic; §41 of this doc is the concrete one |
| `Migration_Map.md` | **Historical record; routes partially stale** | Stitch↔page mapping as design provenance | Route `/project` no longer exists; `/faculty/problems/create` is actually `/faculty/create-problem`; progress table predates freeze |
| `Claude.md` (docs) | **Valid** — engineering constitution | Layering rules, backend rules (§10), single-source-of-truth rules | Current-phase/status sections predate freeze |
| `prd.md` / `trd.md` | Product intent (priority 5) | Vision, workflow philosophy | Anywhere they imply task boards, PM features, or file uploads — the frontend does not have them |
| `ProjectRoadmap.md` | Aspirational | Phasing intent | Not a contract |
| `UI_UX_GUIDELINES.md` | Valid, frontend-only | — | Not backend-relevant |

**Canonical decision on conflicts:** the four-stage journey
(Idea → PoC → Selection → Final) **replaces** the project-workspace/task/
milestone model everywhere. Any doc referencing tasks, milestones, project file
uploads, or a single-review model is superseded by §9/§12/§21 of this document.

---

## 5. Product Domain Model

Twelve domains, one modular monolith:

```
auth            identity, sessions, RBAC
institutions    tenant boundary + departments
users           student/faculty profiles (editable identity)
problems        problems, drafts, bookmarks, suggestions (mentor-gated)
participation   applications (solo/team) to problems
teams           teams, membership, invitations, join requests
projects        the four-stage submission journey
reviews         stage decisions, selection, evaluation
credits         credit awards → transactions → summaries (single source of truth)
leaderboard     derived ranking (read-only over credits)
portfolio       composed public identity (profile + verified activity)
platform        solutions hub, notifications, analytics, admin consoles, audit
```

Workflow (matches the frontend exactly):

```
Faculty creates problem ──────────────► published problem (status: open)
Student suggests problem ─► mentor decision ─► approved ⇒ published problem
Student discovers ─► applies (solo | team) ─► project created
Project journey: Idea ─► PoC ─► Faculty Selection ─► Final Project
Faculty reviews each stage: approve / changes_requested / reject
PoC review carries the extra decision: select (unlocks Final)
Final approval ─► credit award ─► optional publish to Solutions Hub
Credits ─► Leaderboard ─► Portfolio ─► Institutional analytics
```

There is **no** sprint planning, kanban, task tracking, or issue management.
Do not build any.

---

## 6. Actors and Roles

| Role | Can do (summary) |
|---|---|
| `student` | Browse problems, bookmark, suggest problems, apply solo/team, create/manage/leave teams, author & submit stages, edit own profile, curate own portfolio, view own credits |
| `faculty` | Create/publish problems + drafts, review nominated suggestions, review stages, select teams, award credits, publish to Solutions Hub, edit own faculty profile |
| `admin` | User directory, institution directory (create/edit/verify/suspend), platform dashboard |
| `principal` | Institution dashboard + analytics (read-only), report exports (client-side) |

One primary role per user (DECISIONS.md §6). No role hierarchies, no custom
permission editing in v1 — the `roles`/`permissions` tables in DATABASE_SCHEMA.md
may be collapsed to a `role` enum column; keep the door open by isolating checks
in one authorization module (§15).

---

## 7. Authorization Matrix

Legend: ✔ allowed, own = own resources only, inst = same institution only.

| Operation | student | faculty | admin | principal |
|---|---|---|---|---|
| List/read published problems | ✔ | ✔ | ✔ | ✔ |
| Create/publish problem, save draft | — | ✔ | — | — |
| Read own problem drafts | — | own | — | — |
| Bookmark problem | ✔ | — | — | — |
| Create suggestion / read own | own | — | — | — |
| Read suggestions nominating me / decide | — | own (nominated mentor) | — | — |
| Apply to problem / withdraw | own | — | — | — |
| Create team | ✔ | — | — | — |
| Invite/remove member, answer join requests | lead only | — | — | — |
| Request to join / leave team | ✔ | — | — | — |
| Read own projects/journeys | own (member) | mentor's | — | — |
| Save/submit stage | own (member) | — | — | — |
| Review queues / stage decision / select | — | assigned mentor only (ADR-3) | — | — |
| Award credits / set publication | — | ✔ (reviewer) | — | — |
| Read own credit ledger | own | own | — | — |
| Leaderboards (read) | ✔ | ✔ | ✔ | ✔ (public) |
| Read public portfolio | ✔ public | ✔ | ✔ | ✔ |
| Edit own profile / portfolio customization | own | own (faculty profile) | — | — |
| Admin users / institutions / dashboard | — | — | ✔ | — |
| Institution analytics | — | — | — | ✔ (inst) |
| Notifications (own feed) | own | own | own | own |

**Enforced escalation guards:**
- *Horizontal:* every `own` row filters by `user_id` from the JWT, never from
  the request body. `GET /portfolio/{userId}` returns only visibility-gated
  public fields for non-owners (mock: `composeFromLeaderboard` strips contact,
  socials, private identity).
- *Vertical:* role check via dependency on every router; UI gating
  (`ProtectedRoute`) is explicitly demo-only per its own docstring.
- *Cross-institution:* every institution-owned query filters by the caller's
  `institution_id` (§16).

---

## 8. Core Business Workflows

Ported from the mock's guards — these are the server-side rules:

**Problem publication** — Faculty `POST /problems` publishes immediately
(status `open`). Drafts are saved separately and never public. There is no
"problem approval" step for faculty-authored problems in the current frontend.

**Student suggestion** — save draft or submit (`pending_mentor_review`). Only
`draft`/`changes_requested` suggestions may be edited/resubmitted ("already with
your mentor" otherwise). The nominated mentor decides; `approved` publishes an
open problem (mentor becomes its faculty owner, defaults: Intermediate, team
size 4, 12 weeks, 200 credits) and links back via `published_problem_id`.
Feedback is **required** for `changes_requested` and `rejected`.

**Application** — one application per student per problem (`applicationStatus`
guard); rejected if problem `closed`; `ideaSummary` and `approach` required;
`teamId` present ⇒ team application, absent ⇒ solo. **A successful application
atomically creates the Project** (mentor = problem author, journey opens at
IDEA/draft) — ADR-1. Withdrawal allowed while the project's idea stage is
still a draft; withdrawing soft-deletes the project.

**Team lifecycle** — creator becomes lead; a student has at most one own team
(`mine` is exclusive in the mock). Lead-only: invite (email format checked, no
duplicate member/invite, only while `openSpots > 0`), remove (never the lead).
Any member may leave, but a lead with other members must hand over leadership
first; the last member leaving disbands the team. Join requests require a
message, one per student per team, blocked at 0 open spots; only the lead
answers them; accepting seats the student and decrements open spots.

**Stage submission** — see §9 state machines. Save = draft, submit = `submitted`.
Guards: PoC requires idea past draft; Final requires `selection = selected`;
no edit while `submitted`/`under_review`; no resubmit after `approved` (final).

**Review** — only `submitted`/`under_review` stages are decidable. `select` is
valid on the PoC stage only. Non-approve decisions require written feedback.
`select` also settles Selection (`selected`); rejecting the PoC settles it
`not_selected`. Approving final does NOT auto-award credits.

**Credits** — award only after final `approved`; five non-negative components
(innovation, implementation, documentation, presentation, bonus); total is
computed server-side. Award transitions the lifecycle to `completed`.

**Publication** — only an approved final project may be published to the
Solutions Hub; publish is a boolean the faculty may also leave off.

---

## 9. State Machines

Derived from `status.ts`, `stages.ts`, and the mock's transition code. The
backend **rejects any transition not listed**.

**Problem** `open → in_progress → closed` (plus unpublished drafts held
separately). Only `open` accepts applications.

**ProblemSuggestion**
```
draft ──submit──► pending_mentor_review ──approve──► published   (terminal)
  ▲                        │ ├──changes_requested──► changes_requested ──resubmit──► pending_mentor_review
  └──save──┘               └──reject──► rejected                 (terminal)
```
(`approved` exists in the type union but the mock goes straight to `published`
on approval — implement approval ⇒ `published` atomically with problem creation.)

**Application** `pending → withdrawn` (student). Per ADR-1 (ACCEPTED) there is
no accept/reject transition: a successful application creates the project in
the same transaction, and `withdrawn` (allowed only while the idea stage is
draft) soft-deletes that project.

**Stage (idea / poc / final)** — `SubmissionStatus`:
```
draft ──student submit──► submitted ──faculty opens──► under_review
submitted|under_review ──approve──► approved            (idea/poc: unlocks next)
submitted|under_review ──changes_requested──► changes_requested ──student resubmit──► submitted
submitted|under_review ──reject──► rejected             (terminal)
```
Student may edit only in `draft` or `changes_requested` (`isEditable`).

**Selection** — `SelectionStatus`:
```
not_reviewed ──select (on PoC review)──► selected        (unlocks final)
not_reviewed ──reject PoC──► not_selected                (terminal)
not_reviewed ──changes_requested (on PoC)──► stays not_reviewed (PoC goes back)
```

**Stage unlocking** (mock `unlockedStages`/`currentStage`): idea always; poc once
idea ≠ draft; selection visible once poc ≠ draft; final only when
`selection = selected`.

**Lifecycle status** (`ReviewLifecycleStatus`) is **derived, never stored** —
computed exactly as mock `lifecycleStatus()` (final first, then selection, then
poc, then idea; `completed` = final approved AND credits awarded). The 7-step
timeline is composed exactly as mock `composeTimeline()`.

**Team** `recruiting → applied → selected → completed` (composed from
application + selection state; also derived, not directly settable).

**Notification** `unread → read` (idempotent).

---

## 10. Domain Entities

Required schema (entities justified by current frontend functionality):

| Entity | Justified by |
|---|---|
| `institutions` | Admin Institutions console (`AdminInstitution`, status verify/suspend) + tenancy mandate |
| `departments` | Problem department, profiles, analytics breakdowns |
| `users` (role enum, institution_id) | Auth, directory, all ownership |
| `refresh_tokens` | JWT + refresh (DECISIONS §6) |
| `student_profiles` | `StudentProfile` + `ProfileVisibility` |
| `faculty_profiles` | `FacultyProfile` |
| `problems` (+ status incl. draft, author) | Catalog, create/draft flows |
| `problem_resources` | `ProblemAttachment[]` |
| `problem_tags` | skills/tools tags |
| `problem_bookmarks` | bookmark toggle, savedOnly filter |
| `problem_suggestions` | Suggestion lifecycle |
| `applications` | Apply solo/team, withdraw, applicant counts |
| `teams` | Team formation |
| `team_members` | Roster, lead flag/role |
| `team_invitations` | Lead invites by email |
| `team_join_requests` | Request/accept/reject |
| `projects` | My Projects, journeys (holds selection state columns) |
| `stage_submissions` | idea/poc/final payloads + review verdicts |
| `credit_awards` | Per-project five-component award |
| `credit_transactions` | Ledger (`CreditTransaction`), engine source of truth |
| `credit_rules` | `CreditRule` display + engine config |
| `solutions` | Solutions Hub cards (+ link to project on publish) |
| `portfolio_customizations` | `PortfolioCustomization` |
| `notifications` | Feed + read state |
| `audit_logs` | §32; also feeds admin `SystemLogEntry`/`AuditEntry` panels |

**Deliberately absent** (no frontend functionality): project_tasks,
project_files, project_milestones, review_rubrics, portfolio_entries,
portfolio_exports, notification_preferences, leaderboard_snapshots (v1 computes
live; snapshot later only if rank-change tracking needs it — see §24).

---

## 11. Entity Relationships

```
institutions 1─* departments 1─* users
users 1─1 student_profiles | faculty_profiles
users(faculty) 1─* problems 1─* {problem_resources, problem_tags, applications, teams}
users(student) *─* problems  via problem_bookmarks
users(student) 1─* problem_suggestions *─1 users(faculty mentor)
problem_suggestions 0..1─1 problems (published_problem_id)
teams 1─* team_members *─1 users(student)
teams 1─* team_invitations / team_join_requests
applications *─1 problems, *─1 users(student), 0..1─1 teams
projects *─1 problems, 0..1─1 teams, *─1 users(faculty mentor)
projects 1─* stage_submissions (one per stage, UNIQUE(project_id, stage))
projects 0..1─1 credit_awards
credit_awards 1─* credit_transactions (one per team member on award)
projects 0..1─1 solutions (on publish)
users 1─1 portfolio_customizations
users 1─* notifications / credit_transactions / audit_logs
```

---

## 12. Database Architecture

PostgreSQL 16, SQLAlchemy 2.x (declarative, async optional — sync is fine at
pilot scale), Alembic migrations. UUID PKs (`gen_random_uuid()`), `created_at`/
`updated_at` on every table, soft-delete (`deleted_at`) only where the frontend
implies recovery value (users, problems, teams, projects) — hard delete for
tokens/notifications.

Key table shapes (columns beyond the obvious):

```sql
institutions(id, name, full_name, code UNIQUE, type, city, state, website,
  support_email, address, status inst_status DEFAULT 'pending', tier,
  principal_name, principal_email, principal_verified bool DEFAULT false)

users(id, institution_id FK, department_id FK NULL, email UNIQUE (global — ADR-6:
  login is email-only, so one address must resolve to one identity; strictly
  stronger than UNIQUE(institution_id,email)),
  password_hash, name, role role_enum, status user_status DEFAULT 'active')

problems(id, institution_id, department_id, created_by FK users, title, summary,
  statement, current_challenge, expected_impact, difficulty, status problem_status
  DEFAULT 'draft' /* draft|open|in_progress|closed */, required_skills text[],
  team_size int CHECK(team_size>=1), allow_individual bool, start_date, end_date,
  base_credits int CHECK(base_credits>=0), suggestion_id FK NULL)

problem_suggestions(id, institution_id, student_id, mentor_id, status sugg_status,
  title, description, category, importance, expected_impact,
  reference_links text[], mentor_feedback, submitted_at, reviewed_at,
  published_problem_id FK NULL)

applications(id, problem_id, student_id, team_id NULL, idea_summary, approach,
  attachment_url, status app_status DEFAULT 'pending',
  UNIQUE(problem_id, student_id))

teams(id, institution_id, problem_id, name, pitch, leader_id FK users,
  looking_for text[], status derived-in-service)
team_members(id, team_id, student_id, problem_id /* denormalized from team,
  ADR-4 */, role, joined_at, UNIQUE(team_id, student_id),
  UNIQUE(student_id, problem_id) /* one team per student per problem */)
team_invitations(id, team_id, email, role, invited_by, status DEFAULT 'pending',
  UNIQUE(team_id, email) WHERE status='pending')
team_join_requests(id, team_id, student_id, message NOT NULL, status DEFAULT
  'pending', UNIQUE(team_id, student_id) WHERE status='pending')

projects(id, institution_id, problem_id, team_id NULL, mentor_id, title, summary,
  selection_status sel_status DEFAULT 'not_reviewed', selection_feedback,
  selection_decided_by, selection_decided_at, published bool DEFAULT false,
  completed_at NULL)

stage_submissions(id, project_id, stage stage_enum /* idea|poc|final */,
  status submission_status DEFAULT 'draft', payload jsonb, saved_at,
  submitted_at, reviewed_at, reviewed_by FK NULL,
  review_strengths, review_weaknesses, review_suggestions, review_comments,
  evaluation jsonb NULL /* FinalEvaluation, final stage only */,
  UNIQUE(project_id, stage))

credit_awards(id, project_id UNIQUE, innovation int, implementation int,
  documentation int, presentation int, bonus int,
  total int GENERATED ALWAYS AS (innovation+implementation+documentation+
  presentation+bonus) STORED, awarded_by, awarded_at,
  CHECK (innovation>=0 AND implementation>=0 AND documentation>=0
     AND presentation>=0 AND bonus>=0))

credit_transactions(id, institution_id, user_id, source, source_id NULL,
  points int, description, context, created_at,
  UNIQUE(user_id, source, source_id) /* idempotency — no duplicate award */)

credit_rules(id, role role_enum, event_type, points int, description,
  active bool DEFAULT true, effective_from, effective_to NULL) /* ADR-5:
  seeded config, one engine for students AND faculty */

portfolio_customizations(user_id PK/FK, published bool, headline, introduction,
  featured_skills text[], sections jsonb)

solutions(id, institution_id, project_id UNIQUE NULL, problem_id NULL, name,
  icon, status sol_status /* live|testing|pilot */, description, category,
  tags text[], meta_label, meta_value, cta_label, featured bool,
  highlight_tag, url)

notifications(id, user_id, kind /* info|success|warning|error */, title,
  message, link, read bool DEFAULT false, created_at)

audit_logs(id, institution_id NULL, actor_id NULL, action, entity, entity_id,
  metadata jsonb, created_at)
```

**Stage payloads are JSONB** — they are documents the UI round-trips, never
queried field-by-field. Statuses/timestamps/review verdicts are columns
because queues and analytics filter on them.

JSONB is never a validation escape hatch. Every write follows:

```
HTTP Request → Pydantic Request Schema (per stage: IdeaSubmission,
PocSubmission, FinalSubmission) → field validation → business rule
validation → authorization validation → state transition validation →
database transaction → JSONB persistence
```

Each stage has its own explicit request schema; there are no generic
"anything goes" JSON endpoints, and arbitrary unvalidated JSON is never
persisted.

---

## 13. Database Constraints and Indexes

Constraints (beyond §12 inline):
- FKs everywhere shown in §11, `ON DELETE RESTRICT` default; `CASCADE` only for
  pure children (problem_tags, problem_resources, stage_submissions,
  team_members, notifications).
- Partial unique indexes for "one pending X" rules (invitations, join requests).
- `CHECK` on all enum-ish text columns via native PG enums.
- `applications.team_id` must reference a team on the same problem — enforce in
  service + a trigger is unnecessary at this scale (service-layer check inside
  the transaction).
- One team per student per problem (ADR-4): DB-enforced via
  `team_members UNIQUE(student_id, problem_id)`; the service additionally
  verifies `team_members.problem_id = teams.problem_id` when seating.
- Rules the DB cannot reasonably express — stage-gating order, mentor-only
  review, "withdraw only while idea is draft", suggestion edit windows,
  roster lock after selection — are enforced transactionally in the service
  layer (§31). Frontend validation is never relied on.

Indexes (query-driven, from actual frontend queries):
- `problems(institution_id, status, department_id)`; `problems(created_by, status)` for drafts;
  trigram or `tsvector` index on title+summary only if catalog search proves slow (pilot: ILIKE is fine).
- `problem_bookmarks(student_id)`, `applications(student_id)`,
  `team_members(student_id)`, `team_join_requests(team_id, status)`.
- `stage_submissions(status, stage)` — review queues;
  `projects(mentor_id)`, `projects(team_id)`.
- `credit_transactions(user_id, created_at DESC)` — ledger;
  `credit_transactions(institution_id)` — analytics.
- `notifications(user_id, read, created_at DESC)`.
- `audit_logs(institution_id, created_at DESC)`, `audit_logs(entity, entity_id)`.

---

## 14. Authentication

Per DECISIONS.md §6 (still valid) and `api/client.ts` (already built for it):

- `POST /api/v1/auth/login` — email + password → access token (JWT, ~15 min) +
  refresh token. **AS BUILT (ADR-8): both tokens are returned in the response
  body and presented as `Authorization: Bearer`. No cookie is set, so there is
  no CSRF exposure and no CSRF protection.** The earlier httpOnly-cookie
  recommendation is deferred to V2: it contradicts the frozen `API_SPEC.md` and
  `api/client.ts`. Rotation on refresh and a revocation row in `refresh_tokens`
  are implemented, plus family-wide revocation on replay of a rotated token.
- `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` (revokes refresh),
  `GET /api/v1/auth/me` → `{ id, name, email, role }` (the frontend `User`).
- Passwords: bcrypt, min-length validated server-side. **AS BUILT:** the
  `bcrypt` package is called directly rather than through passlib — same
  algorithm, one dependency fewer, and passlib's bcrypt backend is unreliable
  against bcrypt 4.x+. Length is bounded at bcrypt's hard 72-byte limit at the
  trust boundary rather than silently truncated.
- JWT claims: `sub` (user id), `role`, `institution_id`, `exp`, `jti`, plus
  `type` (`access` | `refresh`) so the two token kinds are not interchangeable.
- Login attempts recorded (audit log); brute-force: per-account lockout with a
  fixed cool-off is **implemented in Phase 2**; per-IP rate limiting (§33) is
  **NOT YET IMPLEMENTED** and remains scheduled for the hardening phase.
- Login gates, in order, all after the password is verified so that none of them
  answers a question an anonymous caller could otherwise ask: user status must
  be ACTIVE and not soft-deleted, **and the user's institution status must be
  ACTIVE** (§37, ADR-9). `POST /auth/refresh` re-checks both against the
  database rather than trusting the token, so suspending an institution ends
  live sessions within one access-token lifetime (~15 min), not one refresh
  lifetime. The check is a local row read — no external service is contacted.
- Change/forgot/reset password endpoints per API_SPEC §4 — implement change-
  password in v1; forgot/reset requires email infrastructure → **PLANNED**, not
  v1 (no frontend surface exists for it).

**Frontend seam:** replace `AuthProvider.login(role)` with a real
`POST /auth/login` call storing the returned token (its own docstring says
exactly this). This is the one sanctioned frontend change during integration —
plus the `LoginPage` gaining email/password fields. Everything else consumes
`useAuth()` unchanged.

---

## 15. Authorization / RBAC

- One `require_role(*roles)` FastAPI dependency + one `authorize` module holding
  every ownership predicate (`is_team_lead`, `is_project_member`,
  `is_nominated_mentor`, `same_institution`). Routers declare; the module decides.
- Every "own" access derives identity from the JWT — user ids in paths are only
  accepted for public reads (portfolio) and admin.
- Ownership predicates ported 1:1 from the mock: `canManage = leaderId == me`,
  suggestion decisions only by the nominated mentor while
  `pending_mentor_review`, stage edits only by project members while editable.
- 401 = unauthenticated, 403 = authenticated-but-forbidden, 404 for resources
  the caller may not know exist (cross-institution reads return 404, not 403).

---

## 16. Institution Isolation

- `institution_id` on: users, problems, problem_suggestions, teams, projects,
  credit_transactions, solutions, audit_logs (departments belong to an
  institution; children inherit scope through their parent where the FK chain
  is unambiguous — e.g. `stage_submissions` scope via project).
- Every list/read query in institution-owned domains appends
  `WHERE institution_id = :caller_institution` from the JWT — centralized in a
  repository-layer helper, not repeated ad hoc.
- Admin role operates **across** institutions (platform operator); principal is
  scoped to their own. Public surfaces (open problems, leaderboard, portfolio,
  solutions) are single-institution in the pilot; when multi-tenant, they scope
  by the institution in context (ADR-2, ACCEPTED — isolation is mandatory
  from V1, never postponed to the SaaS version).
- Pilot ships with ONE seeded institution (CRCE); the boundary is enforced from
  day one so college #2 is a row, not a refactor.

---

## 17. Problem Workflow

Endpoints (paths from the mock's annotations):

| Method + Path | Auth | Notes |
|---|---|---|
| `GET /problems` | public* | Full catalog page: `page,limit,search,department,saved_only,sort` → `ProblemCatalogPage` (items + departments facet + stats over whole set). `saved_only` requires student auth |
| `GET /problems/{id}` | public* | Includes caller's `applicationStatus` + `bookmarked` when authenticated |
| `POST /problems` | faculty | `CreateProblemInput` → publish (status open). Author from JWT, never from body (`facultyName` in the input is display-only legacy — ignore it server-side) |
| `POST /problems/drafts` / `GET /problems/drafts` | faculty | Owner's drafts (mock: `saveDraft`/`drafts`) |
| `PUT /problems/{id}/bookmark` / `DELETE` | student | Toggle; returns updated problem |
| `GET /mentors` | student | Active faculty (id, name, department) |
| `GET /problem-suggestions` | student/faculty | Own as author; nominating-me as mentor |
| `POST /problem-suggestions` · `PUT /problem-suggestions/{id}` | student | `?submit=` draft vs submit; edit only in draft/changes_requested |
| `POST /problem-suggestions/{id}/decision` | faculty (nominated) | Approve ⇒ create+publish problem + link, atomically. Feedback required unless approving |

Validation: dates ISO `yyyy-mm-dd`, `deadlineDate > registrationDate`,
`teamSize ≥ 1`, `baseCredits ≥ 0`, non-empty title/summary/statement.
Side effects: publish and decision raise notifications (§25) + audit rows.

\* public read; institution-scoped once multi-tenant.

---

## 18. Student Participation

| Method + Path | Rules (from mock) |
|---|---|
| `POST /problems/{id}/applications` | body `ApplicationInput`; reject if problem closed, already applied, or empty ideaSummary/approach; `teamId` ⇒ team application (caller must be a member; recommend lead-only) |
| `DELETE /problems/{id}/applications/me` | withdraw while pending |

Per **ADR-1 (ACCEPTED)**: the successful `POST` above creates the application
AND the project in one transaction — mentor = problem author, idea stage opens
as draft. There is no faculty accept-application step in V1.

---

## 19. Team Workflow

| Method + Path | Rules |
|---|---|
| `GET /teams?problem_id=` · `GET /teams/{id}` | `canManage` composed from JWT |
| `POST /teams` | Creator = lead + first member ("Team Lead"); open spots = problem team_size − 1; **one team per student per problem** (ADR-4, ACCEPTED — the mock's global `mine` restriction is superseded; multi-problem participation is legal) |
| `POST /teams/{id}/invitations` | lead; email valid; not already member/invited; spots > 0 |
| `GET /teams/invitations` | invitations addressed to me |
| `POST /teams/invitations/{id}/accept|decline` | invitee; accept seats them + decrements spots (mock omits the seating — implement it properly) |
| `POST /teams/{id}/join-requests` | message required; one pending per student; spots > 0 |
| `GET /teams/mine/join-requests` | lead only |
| `POST /teams/join-requests/{id}/accept|reject` | lead; accept seats student, decrements spots |
| `DELETE /teams/{id}/members/{memberId}` | lead; never the lead |
| `DELETE /teams/{id}/members/me` | lead must hand over first if others remain; last member out disbands (soft-delete team) |

Membership changes while a team has submitted work: lock roster once the team's
application is accepted (project exists) — matches `Team.status` moving past
`recruiting`.

There is **no independent Team Profile domain.** Teams are id + name + pitch +
roster + recruitment metadata. Do not build one.

---

## 20. Project Workflow

| Method + Path | Returns |
|---|---|
| `GET /projects` | Caller's projects with derived `stage`/`stageStatus` (mock `withStage`) |
| `GET /projects/{id}` | One project (member/mentor only) |
| `GET /projects/{id}/journey` | Full `ProjectJourney` — composed exactly per mock `composeJourney` (problem join, team join, unlocked stages, derived lifecycle status, 7-step timeline, credits, published) |
| `PUT /projects/{id}/idea` `?submit=` | Stage-gated save/submit (§8, §9) |
| `PUT /projects/{id}/proof-of-concept` `?submit=` | requires idea ≠ draft |
| `PUT /projects/{id}/final` `?submit=` | requires selection = selected |

`Project.progress` is derived (stages completed / 4) — do not store it.
`completedAt` set when credits are awarded.

---

## 21. Review Engine

| Method + Path | Rules |
|---|---|
| `GET /reviews/queues` | Four queues (idea, poc, final, completed) from `stage_submissions.status ∈ (submitted, under_review)` — highest pending stage wins (mock `queueOf`); completed = approved/completed/rejected lifecycles; oldest submission first. **Filtered to `projects.mentor_id = caller` (ADR-3)** |
| `GET /reviews/{projectId}` | The journey (reviewer view). Side effect: transitions the pending stage `submitted → under_review` on first faculty open |
| `POST /reviews/{projectId}/{stage}` | `StageReviewInput`. Guards: stage must be submitted/under_review; `select` only on poc; feedback required for changes/reject. `select` ⇒ stage approved + selection selected. Reject poc ⇒ selection not_selected. Reviewer identity from JWT; **only the assigned project mentor may decide (ADR-3)** — no review pools, external reviewers, or reassignment in V1 |
| `POST /projects/{id}/credits` | Only after final approved; five components ≥ 0; writes `credit_awards` + fan-out `credit_transactions` per team member, **in one transaction, idempotent** (unique on project) |
| `POST /projects/{id}/publication` | Only after final approved; `publish: true` creates/activates the `solutions` row |

**Immutability:** a decided stage's review verdict is immutable; `rejected` and
`not_selected` are terminal; `credit_awards` rows are write-once (corrections =
compensating credit transaction, admin-only, audited). No review editing
endpoint exists in the frontend — do not add one.

Rubric: the scored `FinalEvaluation` (5 × 0–10 + remarks) exists **only on the
final stage**; other stages take free-text strengths/weaknesses/suggestions/
comments. No configurable rubric system.

---

## 22. Portfolio

**Profile = source/editing layer. Portfolio = presentation layer.** (Confirmed
by the frontend: `composePortfolio` merges `StudentProfile` identity + verified
modules; `PortfolioVerified = Omit<Portfolio, ProfileOwnedField>` makes the
split explicit. Never store a second copy of profile fields.)

| Method + Path | Behavior |
|---|---|
| `GET /students/me/profile` · `PATCH` | Editable identity incl. `visibility` flags |
| `GET /faculty/me/profile` · `PATCH` | Faculty editable identity |
| `GET /faculty/me/reputation` | System-generated, read-only (v1: computed from reviews/mentorships; some display fields may stay seeded until enough data exists — mark as demo-derived) |
| `GET /portfolio/{userId}` | Owner (`me`): full composition. Others: **visibility-enforced public view** — contact gated by `showContact`, socials by `showSocials`, whole page by `publicProfile`/`published` |
| `GET /portfolio/me/customization` · `PATCH` | Curation layer (`published`, headline/introduction overrides, featured skills, section toggles) |

Verified portfolio content classification:
- **Platform-generated/verified:** projects (+stages), credits, rank, verified
  solutions count, faculty validation count, hall-of-fame badges, timeline —
  derived from projects/credits/reviews. Never user-editable (DECISIONS §10).
- **User-entered:** identity fields, personalSkills, socials — via profile only.
- **Currently mock-only with no entry UI:** research, hackathons, certificates,
  external achievements. v1: serve empty/seeded lists; the section toggles
  already handle absence. Do **not** build CRUD for them (no frontend forms).

---

## 23. Credit Engine

Single auditable source of truth (DECISIONS §10):

```
VERIFIED ACTIVITY (final approval + award) ─► credit_awards (event)
  ─► credit_transactions (one per member, idempotent)
  ─► aggregated summaries (SUM per user)  ─► leaderboard, portfolio, analytics
```

- `GET /credits/summary|history|me|rules|categories|pipeline` — summary
  (level/milestone math lives in the engine service, config-driven thresholds),
  ledger, breakdown by source, rules listing, category tallies, pipeline
  (= caller's submissions currently pending review, with potential credits from
  the problem's `base_credits`).
- Duplicate prevention: `UNIQUE(user_id, source, source_id)` — awarding twice
  for the same project is impossible at the DB layer.
- Levels/milestones: a small config table or constants module
  (engine version label included in the summary payload).
- Faculty credits (**ADR-5, ACCEPTED**): faculty use the SAME engine and the
  same transaction ledger — never a second credit system. Rules are
  seeded/configurable rows in `credit_rules` (§12), not hardcoded logic. V1
  faculty events are only those the current product represents:
  `PROBLEM_PUBLISHED`, `REVIEW_COMPLETED`, `MENTORED_PROJECT_COMPLETED`.
  Research publications, industry collaboration, and student-success impact
  are future rule rows, not V1 code.
- **The Credit Engine is the ONLY authoritative mechanism for awarding
  credits.** Leaderboard, portfolio, dashboards, and analytics MUST NOT
  calculate credits independently or invent separate totals — they read the
  engine's transactions/aggregates. Every award is an auditable transaction;
  corrections are compensating transactions (admin-only, audited), never
  edits or deletions.

---

## 24. Leaderboard

One system, two views: `GET /leaderboard/students`, `GET /leaderboard/faculty` —
both `LeaderboardEntry[]` ranked by `SUM(credit_transactions.points)`. Badge =
tier mapping from the Credit Engine. Never computed in the UI, never a second
scoring path.

`rankChange` requires a previous snapshot: v1 computes ranks live and stores a
tiny weekly `(user_id, rank)` snapshot via a scheduled job **only for the delta
arrow**; if the pilot can live with `rankChange: 0` initially, ship that first
and add the snapshot job second.

---

## 25. Notifications

Server-raised on the same mutations the mock instruments (suggestion submitted/
decided, problem published, team created/invite/join-request/accept/leave,
application submitted/withdrawn, stage submitted, every review decision, credits
awarded, published to hub). Payload: kind, title, message, in-app `link` path.

`GET /notifications`, `PATCH /notifications/{id}/read`,
`POST /notifications/read-all`. Recipient resolution: the affected user(s) —
team events → members; review decisions → team members; suggestion decisions →
author. No email, no push, no preference matrix in v1 — the frontend has a bell
panel only.

---

## 26. Analytics

Two consumers, one aggregate each — no separate analytics store in v1; all
derived by SQL at request time (pilot scale makes this trivial):

- `GET /analytics/institution` → `InstitutionAnalytics` (principal dashboard +
  analytics page share it — one endpoint, per the type's own doc comment).
  Source data: users, problems, projects, stage_submissions, credit_transactions
  grouped by department/month. Some display niceties (radar axes, "health"
  qualitative label) are computed presentation — document formulas in the
  service.
- `GET /analytics/campus-impact` → `NameValue[]` (landing/about/hub counters).
- `GET /analytics/departments` → department distribution (dashboards).
- `GET /admin/dashboard`, `GET /admin/users/overview`,
  `GET /admin/institutions/overview` → admin aggregates. KPI tiles, queues and
  health panels compose from real counts where they exist (users, institutions,
  projects, pending verifications) and from `audit_logs` for the log panels.
  Metrics with no v1 source (uptime %, latency) are served from the health
  endpoint or omitted-with-defaults — **do not fabricate a metrics pipeline**.

Dashboards (`GET /dashboard/stats|activity|deadlines|credit-trend`) are simple
role-parameterized derived reads.

---

## 27. File Storage

**None in v1.** Verified by inspection: zero file inputs in the frontend; all
evidence fields are URLs (GitHub, drive links, deployed demos); avatars are
initials; problem attachments are name+type+URL rows entered as links.

When uploads arrive (post-v1), the plan is local on-premise storage (a volume
served by Nginx with authenticated, signed paths), type/size allowlists, and
metadata rows — S3 is not assumed. Until then: build nothing, but validate
submitted URLs (scheme http/https, length caps) as untrusted input.

---

## 28. API Architecture

Transport contract — **already implemented by `api/client.ts`; match it exactly**:

- Base `/api/v1` (frontend env: `VITE_API_BASE_URL`).
- Success envelope `{ success: true, message, data }`; error envelope
  `{ success: false, message, errors?: [{field,message}], error_code?,
  timestamp?, path? }`; `204` for empty responses.
- JWT bearer in `Authorization`; `401` triggers frontend sign-out.
- Pagination: query `page,limit,sort,order,search,filter`; paginated `data` =
  `{ items, pagination: { page, limit, total_items, total_pages, has_next,
  has_previous } }`. Note: the problem catalog uses its own richer
  `ProblemCatalogPage` shape inside `data` — serve it as the mock does.
- snake_case JSON keys server-side; the API repositories on the frontend map to
  the camelCase domain types (they are written when integration starts — the
  swap seam is `repositories/index.ts`).
- OpenAPI docs auto-generated at `/api/v1/docs` (disabled or auth-gated in prod).
- Layering per Claude.md §10: `api (routers) → services → repositories → models`.
  Routers hold zero business logic; services own transactions and rules;
  repositories own queries.

The full endpoint inventory is §17–§26 plus auth (§14); every endpoint traces to
a repository method in `repositories/types.ts` — there are no endpoints without
a frontend consumer.

---

## 29. Frontend → Backend Contract

The definitive matrix. Every data-connected page, its repository calls, and the
endpoints that satisfy them. (Loading state: every page already renders skeleton/
loading via `useAsync`; error state: `ApiError` message surfaces in the page's
error banner; empty states are built into every list page — the backend only
needs correct envelopes and messages.)

| Route | Role | Purpose | Repository calls → Endpoints | DB entities |
|---|---|---|---|---|
| `/` `/about` `/innovation-hub` | public | Marketing + counters | `analytics.campusImpact`, `problems.list`, `leaderboard.*`, `solutions.list` | derived |
| `/login` | public | Auth | (post-integration) `POST /auth/login` | users, refresh_tokens |
| `/open-problems` | public/student | Catalog | `problems.page` → `GET /problems`; `setBookmark`; `suggestions`/`saveSuggestion`; `mentors` | problems, bookmarks, suggestions |
| `/problem/:id` | public/student | Details + apply | `problems.get`; `projects.applyToProblem`/`withdrawApplication`; `projects.teams(problemId)` | problems, applications, teams |
| `/team` | student | Formation | `teams`, `createTeam`, `team`, `inviteMember`, `removeMember`, `leaveTeam`, `requestToJoin`, `joinRequests`, `respondToJoinRequest`, `invitations`, `respondToInvitation` | teams, members, invitations, join_requests |
| `/student/dashboard` | student | Overview | `dashboard.stats/activity/deadlines/creditTrend`, `projects.list`, `notifications.list` | derived |
| `/student/projects` | student | My projects | `projects.list`, `projects.invitations` | projects |
| `/student/projects/:id` | student | **4-stage journey** | `projects.journey`, `saveIdea/savePoc/saveFinal` | projects, stage_submissions |
| `/student/credits` | student | Ledger | `credits.summary/history/breakdown/rules/categories/pipeline` | credit_transactions, rules |
| `/student/profile` | student | Identity + visibility | `profile.get/update`, `portfolio.getCustomization/updateCustomization` | student_profiles, portfolio_customizations |
| `/portfolio/:id` | public | Composed portfolio | `portfolio.get` | composition |
| `/review` (faculty) | faculty | **Review engine** | `reviews.queues/detail/decide/awardCredits/setPublication` | stage_submissions, projects, credit_awards, solutions |
| `/review` (student) | student | My review status | `projects.list` + `journey` | same |
| `/faculty/dashboard` | faculty | Overview | `dashboard.*`, `problems.list` (own), `reviews.queues` counts | derived |
| `/faculty/create-problem` | faculty | Author + drafts + suggestion review | `problems.create/saveDraft/drafts`, `problems.suggestions/decideSuggestion` | problems, suggestions |
| `/faculty/profile` | faculty | Identity + reputation | `facultyProfile.get/update/reputation` | faculty_profiles |
| `/solutions` | public | Marketplace | `solutions.list/stats` | solutions |
| `/leaderboard` | public | Rankings | `leaderboard.students/faculty` | derived from credits |
| `/admin/dashboard` | admin | Platform snapshot | `admin.dashboard` | aggregates + audit_logs |
| `/admin/users` | admin | Directory + panels | `admin.users`, `admin.usersOverview` | users + aggregates |
| `/admin/institutions` | admin | Governance | `admin.institutionDirectory/institutionsOverview/saveInstitution/setInstitutionStatus` | institutions |
| `/principal/dashboard` `/principal/analytics` | principal | Executive views | `analytics.institution` (shared aggregate), `admin.institutions` (dept breakdown) | derived |

---

## 30. Validation

- Pydantic schemas mirror the TS payload types 1:1 (`CreateProblemInput`,
  `ProblemSuggestionInput`, `ApplicationInput`, `CreateTeamInput`,
  `InviteMemberInput`, `IdeaSubmission`, `PocSubmission`, `FinalSubmission`,
  `StageReviewInput`, `CreditAwardInput`, `PublicationInput`,
  `InstitutionInput`, profile patches). Field errors return the documented
  `errors: [{field, message}]` envelope so react-hook-form can map them.
- Every string trimmed; length caps on all free text; URL fields validated
  http/https; email RFC-validated; arrays capped (skills ≤ 20, links ≤ 10 etc.).
- Business validation lives in services (stage gates, role checks), not in
  schemas; the human-readable guard messages in the mock (e.g. "Only teams
  selected for final development can submit a final project.") are the error
  `message` strings — keep them, the UI displays them verbatim.

## 31. Data Integrity

- All §8 guards enforced server-side inside transactions.
- One DB transaction per service mutation; the multi-write flows
  (suggestion approval + problem creation; select decision + selection state;
  credit award + transactions fan-out + project completion; publication +
  solution row) are each atomic.
- Idempotency: unique constraints carry it (application per student/problem,
  award per project, credit transaction per source). Retried POSTs hit the
  constraint and return the friendly conflict message.
- Concurrency: `SELECT … FOR UPDATE` on the stage row when deciding, and on the
  team row when seating members (open-spots race). Optimistic versioning is not
  needed at pilot scale. `# ponytail: row locks now; version columns if
  concurrent reviewing ever becomes real`
- Immutable after finalization: review verdicts, credit awards, audit rows.

## 32. Audit Logging

`audit_logs(actor, action, entity, entity_id, institution, metadata, at)` for:
login success/failure, role/status changes, problem create/publish, suggestion
decisions, application accept, team selection, every review decision, credit
awards, publication, admin user/institution changes. No request bodies, no
tokens, no passwords in metadata. The admin dashboard's log/audit panels read
from this table.

## 33. Security Architecture

| Area | v1 requirement status |
|---|---|
| AuthN: JWT + rotating refresh, bcrypt | REQUIRED FOR V1 — to be implemented during backend build |
| AuthZ: role dependency + ownership module + institution scoping | REQUIRED FOR V1 — to be implemented during backend build |
| SQL injection: SQLAlchemy bound params only, no string SQL | REQUIRED FOR V1 — to be implemented during backend build |
| XSS: JSON-only API; React escapes by default; validate/limit user HTML-free text | REQUIRED FOR V1 — to be implemented during backend build |
| CSRF: **NOT APPLICABLE AS BUILT (ADR-8)** — no cookie is set, no ambient credential, so no CSRF token or SameSite policy exists. Trade-off: tokens held by the SPA are XSS-reachable; mitigated by 15-min access tokens, refresh rotation with family revocation, and the SPA CSP below | DONE — Phase 2 |
| Rate limiting: slowapi/nginx — tight on `/auth/*`, generous elsewhere | REQUIRED FOR V1 — to be implemented during backend build |
| Brute force: account lockout/backoff + audit | REQUIRED FOR V1 — to be implemented during backend build |
| Security headers (nginx): HSTS, X-Content-Type-Options, X-Frame-Options, CSP for the SPA | REQUIRED FOR V1 — to be implemented during backend build |
| Secrets: `.env` (gitignored; `.env.example` committed), never in code | REQUIRED FOR V1 — to be implemented during backend build |
| DB security: dedicated non-superuser role, LAN-only bind, strong password | REQUIRED FOR V1 — to be implemented during backend build |
| HTTPS: nginx TLS (institutional cert or Let's Encrypt if public DNS) | DEPLOYMENT REQUIREMENT |
| Dependency scanning, container hardening | PLANNED |
| Penetration test | **REQUIRES PROFESSIONAL SECURITY REVIEW** — do not claim "secure/certified/pen-tested" anywhere |
| Certification (ISO etc.), patent claims | **REQUIRES LEGAL REVIEW** — no such claims exist in the repo; make none |

## 34. Threat Model

Primary threats and their mitigations (all mapped above): credential stuffing
(rate limit + lockout), token theft (short expiry + rotation + revocation),
horizontal escalation between students (JWT-derived ownership, §7), vertical
escalation (role dependency per router), cross-institution leakage (scoped
queries returning 404), grade/credit tampering (credits only via reviewer flow,
DB-level idempotency, audit), submitted-URL abuse (scheme validation, no
server-side fetching of user URLs — links are rendered, never crawled), spam
(rate limits on suggestion/application/join endpoints), insider admin actions
(audited).

## 35. Fail-Safe Architecture

The college's question — "what happens if something fails?":

| Failure | Behavior |
|---|---|
| Database down | API returns 503 from health-checked pool; frontend shows its error banner; no partial writes (transactions) |
| App crash | Docker `restart: unless-stopped`; stateless app — restart is safe |
| Server reboot | compose services come back via restart policy; DB volume persists |
| Network interruption | Frontend `ApiError(0)` message; retried mutations are idempotent (§31) |
| Duplicate request | Unique constraints absorb it |
| Partial transaction | Impossible by construction — one transaction per mutation |
| Failed migration | Alembic transactional DDL; run against a pre-upgrade backup; `alembic downgrade` path tested per release |
| Failed deployment | Previous image kept; rollback = retag + restart (§37) |
| Backup failure | Backup job exits non-zero → visible in logs + ops checklist; weekly restore test |

Health: `GET /api/v1/health` (liveness, never touches the database) and
`GET /api/v1/health/db` (readiness, DB ping, 503 when unreachable) — used by
Docker healthchecks and nginx. An earlier draft called the readiness probe
`/health/ready`; the implemented name is `/health/db` (ADR-7).

## 36. Backup and Recovery

- Nightly `pg_dump` (custom format) to a second disk/NAS path, 14 daily + 8
  weekly retained. `# ponytail: pg_dump now; WAL archiving when RPO < 24h matters`
- Restore runbook documented and rehearsed: fresh volume → `pg_restore` →
  migrations check → smoke test.
- Data export / pilot termination: `pg_dump` of institution-scoped data is the
  export; document the owning-institution handover (supports the legal
  agreements — the schema's per-institution scoping makes extraction a WHERE
  clause).

## 37. On-Premise Deployment

**Deployment model (ADR-9).** ProjectConnect uses an isolated per-institution
deployment model for the initial SaaS deployment. Each institution operates its
own ProjectConnect application instance and PostgreSQL database on its own
infrastructure. Institutional academic data remains within that deployment.

```
ONE COLLEGE = ONE DEPLOYMENT = ONE POSTGRESQL DATABASE = ONE INSTITUTION

CRCE server                        SFIT server
├── ProjectConnect (api)           ├── ProjectConnect (api)
└── CRCE PostgreSQL                └── SFIT PostgreSQL
```

No academic data (students, faculty, problems, teams, projects, reviews,
credits, portfolios, analytics) ever leaves the college's infrastructure, and no
runtime path reaches a ProjectConnect-operated service. Centralized licensing
and deployment management may be introduced in a future version, but are
intentionally outside the scope of the initial pilot. What exists locally today
is the identity needed to support that later: `institutions.id` (institution
identity), the `DEPLOYMENT_ID` environment value (installation identity), and
`institutions.status` (ACTIVE / PENDING / SUSPENDED — the local lifecycle gate,
enforced at login and refresh, §14).

Institution isolation (§16, ADR-2) is retained even though the pilot database
holds a single institution row: the scoping is defence in depth and the seam
that lets a shared deployment exist later without re-auditing every query.

```
LAN / Internet → Nginx (TLS, static SPA, /api proxy, headers, rate limit)
              → FastAPI (uvicorn, 2–4 workers)   → PostgreSQL 17 (volume)
```

- Docker Compose (`docker-compose.yml`, root): `db` and `api` are implemented,
  both with healthchecks and `restart: unless-stopped`. **Still to add before
  the pilot: an `nginx` service (TLS, SPA, security headers, rate limiting) and
  a `backup` cron sidecar (§36).** Frontend is built static and served by
  nginx — no Node in production.
- Sizing for the 1,000–1,500 registered-user pilot: 4 vCPU, 8 GB RAM, 100 GB
  SSD, Ubuntu LTS. Ports: 443/80 only exposed; DB internal network only. This
  is a sizing target, not a measured concurrency guarantee — see §38.
- Config via env: `DATABASE_URL`, `JWT_SECRET`, `DEPLOYMENT_ID`,
  `CORS_ORIGINS`, `ENV`, backup paths. `.env.example` committed. In
  `ENV=production` the app refuses to start without a unique `JWT_SECRET` of at
  least 32 bytes and a non-empty `DEPLOYMENT_ID`.
- Operational procedures (install, migrate, backup, restore, rollback,
  suspend/reactivate) live in `docs/OPERATIONS.md`.
- Update procedure: build image → `docker compose up -d api` (old image kept) →
  health check → done. Rollback: retag previous image, restart. Migrations run
  as an explicit step (`alembic upgrade head`) before the new API serves.
- Logs: JSON to stdout → Docker log rotation; nginx access/error logs rotated.

## 38. Scalability

- Stage 1 (one college, 1,000–1,500 registered users): the above. Nothing else.
  Registered ≠ concurrent; the realistic concurrent working set is a small
  fraction of it. **No load test has been run and none is claimed** — load
  testing is meaningful only once the core domain endpoints exist.
  Connection budget: `DB_POOL_SIZE` (10) + `DB_MAX_OVERFLOW` (20) = 30
  connections **per uvicorn worker**. Four workers can therefore demand 120
  connections against PostgreSQL's default `max_connections = 100`. Either
  raise `max_connections`, or lower the pool per worker, before running
  multi-worker in production.
- Stage 2 (few colleges, ≤5k): same monolith; add connection pooling tuning
  (SQLAlchemy pool or pgbouncer), pagination is already universal, indexes per
  §13, cache only the public counters (`campus-impact`) if measured hot.
- Stage 3 (SaaS): horizontal API replicas behind nginx (stateless already),
  managed/replicated Postgres, background job runner (the leaderboard snapshot
  job graduates from cron), object storage when uploads exist.
- Explicitly NOT now: microservices, Kafka, Kubernetes, Redis-by-default,
  read replicas. The modular monolith's module boundaries (§5) are the future
  extraction seams if ever needed.

## 39. Logging and Monitoring

Structured JSON logs (request id, user id, route, status, latency); WARN+ for
auth failures and 403/404-scoped denials; audit table for business events (§32).
Monitoring v1 = health endpoints + `docker compose ps` + disk/backup checks on
an ops checklist. Metrics stack (Prometheus/Grafana) is PLANNED, not pilot.

## 40. Testing Strategy

pytest + httpx `TestClient`, factory fixtures, a dedicated test DB (transactional
rollback per test).

- **Unit:** credit engine math, lifecycle-status derivation (port
  `lifecycleStatus`/`composeTimeline`/`unlockedStages` and test them against the
  mock's exact semantics), state-machine guards.
- **API/integration (the core):** every endpoint × happy path + each guard.
- **Authorization tests (mandatory):** for each endpoint — wrong role (403),
  other user's resource (403/404), cross-institution (404), unauthenticated (401).
- **Workflow tests (end-to-end via API):** the full journey — faculty publishes →
  student suggests → mentor approves → team forms → application → idea submit →
  approve → poc submit → select → final submit → approve → credits → publish →
  leaderboard reflects → portfolio reflects. One test tells the pilot story.
- **Database tests:** constraint behavior (duplicate application, double award).
- **Security tests:** rate limiting, lockout, token expiry/rotation, envelope
  shape on errors.

## 41. Backend Project Structure

```
backend/
  app/
    main.py                 FastAPI app factory, routers, middleware
    core/                   config, security (jwt, hashing), deps (auth/roles)
    db/                     session, base, alembic env
    modules/
      auth/                 router, service, schemas
      institutions/
      users/                profiles (student/faculty), directory
      problems/             problems, drafts, bookmarks, suggestions
      teams/                teams, membership, invitations, join requests
      projects/             projects, applications, stage submissions, journey composition
      reviews/              queues, decisions, awards, publication
      credits/              engine, rules, summaries
      leaderboard/
      portfolio/            composition + customization
      solutions/
      notifications/
      analytics/            institution + campus aggregates, dashboards
      admin/                consoles, audit reads
    common/                 envelope helpers, pagination, audit writer, errors
  alembic/versions/
  tests/
  pyproject.toml
```

Each module: `router.py`, `service.py`, `repository.py`, `models.py`,
`schemas.py`. Cross-module calls go service→service, never router→foreign
repository.

## 42. Migration Strategy (mock data → backend)

| Mock source | Classification |
|---|---|
| `mocks/problems.ts`, `projects.ts`, `submissions.ts`, `users.ts`, `directory.ts`, `profile.ts`, `faculty.ts`, `leaderboard.ts`, `credits.ts` (transactions), `solutions.ts`, `institutions.ts`, `notifications.ts` | **REPLACE WITH API** — becomes the Alembic seed/demo dataset so the pilot demos identically |
| `CREDIT_RULES`, credit level thresholds | **KEEP as config/seed** (rules table) |
| Leaderboards, `CREDIT_SUMMARY`, dashboards, `INSTITUTION_ANALYTICS`, `ADMIN_DASHBOARD`, overviews, `CAMPUS_IMPACT`, `SOLUTION_STATS` | **DERIVED FROM BACKEND** — computed aggregates; seeded activity must produce sensible numbers |
| `MOCK_FACULTY_REPUTATION`, portfolio research/hackathons/certificates | **KEEP AS DEMO DATA** initially (no v1 source modules); serve from seed, flagged demo-derived |
| `DEMO_USERS` role-picker login | **REMOVE at integration** — replaced by real auth (the one frontend change, §14) |
| `services/mock.ts` latency shim | **REMOVE** — API repositories replace mock repositories via `repositories/index.ts`; components unchanged |

Integration order: write `repositories/api/` implementations one module at a
time, switching the export in `repositories/index.ts` module-by-module —
the architecture was built for exactly this.

## 43. Implementation Phases

1. **Foundation:** project scaffold, config, DB, Alembic, envelope/error
   middleware, health, CI (lint+tests), docker-compose.
2. **Auth + tenancy:** institutions, users, JWT/refresh, RBAC deps, audit
   writer, seed institution + demo users.
3. **Problems:** catalog (paged), CRUD/drafts, bookmarks, mentors, suggestions.
4. **Teams + participation:** teams, membership, invitations, join requests,
   applications (application auto-creates the project per ADR-1).
5. **Projects + journey:** stage submissions, gating, journey composition.
6. **Review engine:** queues, decisions, selection, credit awards, publication.
7. **Credits + leaderboard + portfolio:** engine, ledgers, rankings,
   composition + customization, profiles.
8. **Platform:** solutions, notifications, analytics aggregates, admin consoles.
9. **Integration:** frontend `repositories/api/`, real login page, E2E pass.
10. **Deployment:** compose hardening, backups, runbooks, pilot readiness check.

## 44. Pilot Readiness

Done when: all §40 tests green; the §40 end-to-end story runs against a
seeded fresh deployment; backups verified restorable; §33 build-items
implemented; deployment runbook executed on the college box from scratch;
frontend served by nginx passes the same manual click-through as the freeze.

## 45. What NOT to Build

- No task boards, milestones, sprints, kanban, issue tracking, file uploads,
  avatar uploads, email delivery, notification preferences, chat.
- No microservices, Kafka, Kubernetes, Redis (until measured), GraphQL,
  websockets (bell panel polls/loads on demand).
- No Team Profile domain, no separate portfolio entry CRUD, no second analytics
  store, no review-editing endpoints, no configurable rubric builder.
- No endpoints without a frontend consumer in §29.

## 46. Architectural Decisions (made by this document)

1. Frontend repository interfaces are the API surface; mock guards are the
   business rules. (Source-of-truth rule applied.)
2. Stage payloads as JSONB + status/review columns (§12).
3. Selection state lives on `projects`, not a fifth submission row.
4. Lifecycle status and timeline are derived, never stored.
5. `institutions` table + `institution_id` scoping from day one, single seeded
   institution for the pilot.
6. Role = enum column; permission tables deferred.
7. No file storage service in v1 (evidence is URL-based).
8. Credits fan out one transaction per team member at award time, idempotent.
9. Client-side CSV stays client-side.
10. `roles`/rank snapshots, forgot-password email, metrics stack: deferred.

## 47. Final V1 Architectural Decisions

All five previously open decisions are **RESOLVED — STATUS: ACCEPTED**
(2026-08-11). The canonical records, with context, consequences, and
alternatives considered, live in `docs/DECISIONS.md` §15. No unresolved
architectural decision remains for backend v1.

**ADR-1 — Application automatically creates Project (ACCEPTED).**
A successful student application atomically creates the corresponding Project
(mentor = problem author); the IDEA stage becomes available immediately. There
is no separate faculty accept-application stage — the current frontend has no
surface for one. The backend still validates student eligibility, problem
availability, duplicate application, institution ownership, team membership
rules, and stage transitions before creating the pair. Withdrawal, allowed
while the idea stage is draft, soft-deletes the project. (§8, §9, §18)

**ADR-2 — Institution isolation from V1 (ACCEPTED).**
All institution-owned resources (users, problems, applications, teams, team
memberships, projects, stage submissions, reviews, credit records,
notifications, analytics) are institution-scoped from day one. Cross-
institution access is impossible through authorization checks — scoped reads
return 404. Multi-tenant design ships in the single-college pilot; isolation
is never postponed to the SaaS version. (§16)

**ADR-3 — Mentor-only review for V1 (ACCEPTED).**
Only the assigned project mentor performs stage reviews (IDEA, POC, SELECTION,
FINAL). Queues filter to `projects.mentor_id = caller`. No review pools,
external reviewers, admin reassignment, or multiple-reviewer workflows in V1;
the schema leaves room for future expansion. (§21)

**ADR-4 — One team per student per problem (ACCEPTED).**
A student may participate in multiple problems, but per problem belongs to at
most one team. Enforced at the database (`team_members
UNIQUE(student_id, problem_id)` via a denormalized `problem_id`) and verified
transactionally in the service layer. No global one-team restriction; no Team
Profile domain — Team stays a workflow entity. (§12, §13, §19)

**ADR-5 — Configurable faculty credit rules on the shared Credit Engine
(ACCEPTED).**
Faculty and students share ONE Credit Engine, one transaction ledger, one
source of truth. Rules are seeded/configurable `credit_rules` rows (role,
event_type, points, description, active, effective_from, effective_to). V1
faculty events: `PROBLEM_PUBLISHED`, `REVIEW_COMPLETED`,
`MENTORED_PROJECT_COMPLETED` — only what the current product represents.
Duplicate awards prevented by the unique event key; corrections are
compensating transactions. Leaderboard, portfolio, dashboards, and analytics
read from the engine and never compute credits independently. (§12, §23, §24)

## 48. Claude Opus Implementation Contract

Claude Opus MUST implement the backend according to this document.
Claude Opus MUST NOT redesign the architecture without an explicit
architectural decision recorded in DECISIONS.md.
Claude Opus MUST NOT modify frozen frontend behavior.
Claude Opus MUST enforce authorization on the backend (§7, §15).
Claude Opus MUST enforce institution isolation (§16, ADR-2).
Claude Opus MUST enforce business state transitions (§9).
Claude Opus MUST use the Credit Engine as the single credit source (§23, ADR-5).
Claude Opus MUST validate JSONB stage payloads through typed schemas (§12, §30).
Claude Opus MUST create database migrations through Alembic.
Claude Opus MUST provide automated tests for critical workflows (§40).
Claude Opus MUST provide secure error handling (§28 envelopes; no internal
exceptions or secrets leaked).
Claude Opus MUST provide deployment configuration (§37).
Claude Opus MUST provide backup/recovery documentation (§36).

**BUILD FIRST:** Phases 1–2 (§43): scaffold, envelope middleware, health, DB,
Alembic baseline, institutions+users+auth+RBAC+audit, seeds.
**BUILD SECOND:** Phases 3–6: problems → teams/participation → journey →
review engine. This is the product spine; the §40 end-to-end test must pass at
the end of phase 6 (with credits stubbed until phase 7 if needed).
**BUILD THIRD:** Phases 7–8: credits/leaderboard/portfolio, then platform
surfaces (solutions, notifications, analytics, admin). Then integration (9) and
deployment (10).
**DO NOT BUILD:** anything in §45.

**DATABASE RULES:** §12–§13 schema; Alembic-only DDL; UUID PKs; enums for
statuses; constraints carry idempotency; no stored derived fields (§46.4).
**API RULES:** §28 transport exactly; endpoint inventory only from §17–§26 +
§14; mock guard messages verbatim as error messages; snake_case JSON.
**AUTHORIZATION RULES:** §7 matrix + §15 module; identity from JWT only;
institution scoping per §16; 404 for cross-tenant.
**SECURITY RULES:** §33 build-items are in scope, non-negotiable; never claim
certified/pen-tested/patented.
**TESTING REQUIREMENTS:** §40; authorization tests for every endpoint; the
end-to-end workflow test is the definition-of-working.
**DEPLOYMENT REQUIREMENTS:** §37 compose stack; fill the empty
`docker-compose.yml`; health checks; env-only config.
**BACKUP REQUIREMENTS:** §36 nightly dump + tested restore runbook.
**FRONTEND INTEGRATION REQUIREMENTS:** do not modify the frontend except:
(a) `repositories/api/` implementations + the switch in `repositories/index.ts`,
(b) real login in `AuthProvider`/`LoginPage` per §14. Every other file is frozen.

**Definition of Done:** §44 pilot-readiness checklist, entirely green. The
five ADRs in §47 are already resolved (ACCEPTED, recorded in DECISIONS.md §15)
— implement them as written; they are not open questions.
