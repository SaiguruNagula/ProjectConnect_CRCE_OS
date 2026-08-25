# 05_DECISIONS.md

# 1. Document Information

| Item | Details |
|------|---------|
| Document | Engineering Decisions |
| Product | CRCE OS |
| Version | 1.0 |
| Status | Active |
| Owner | CRCE OS Team |
| Purpose | Record the rationale behind key engineering decisions to ensure long-term consistency and prevent architectural drift. |

---

# 2. Purpose

This document captures the reasoning behind the most important technical and architectural decisions made during the development of CRCE OS.

It serves as a permanent engineering reference for current and future contributors.

Objectives:

- Explain **why** specific technologies and patterns were selected.
- Prevent accidental changes to core architecture.
- Preserve project knowledge over time.
- Ensure consistency across future development.
- Provide context for design trade-offs.

This document records decisions, not implementation details. When a decision changes, update the Decision Log while preserving the historical record.

---

# 3. Technology Decisions

## Backend

**Decision:** FastAPI

**Reason:**

- High performance
- Modern Python ecosystem
- Automatic OpenAPI documentation
- Strong type safety with Pydantic
- Excellent async support
- Easy to maintain

---

## Frontend

**Decision:** React + TypeScript + Vite

**Reason:**

- Component-based architecture
- Large ecosystem
- Strong typing
- Fast development
- Excellent maintainability
- Ideal for modular applications

---

## Styling

**Decision:** TailwindCSS + shadcn/ui

**Reason:**

- Reusable components
- Consistent design system
- Easy customization
- Responsive by default
- Minimal CSS maintenance

---

## Database

**Decision:** PostgreSQL

**Reason:**

- Relational data integrity
- ACID compliance
- Excellent indexing
- Mature ecosystem
- Scalable for institutional data

---

## ORM

**Decision:** SQLAlchemy + Alembic

**Reason:**

- Strong ORM support
- Migration management
- Flexible relationships
- Production-proven

---

## State Management

**Decision:** TanStack Query + Zustand

**Reason:**

- Clear separation of server and client state
- Efficient caching
- Minimal boilerplate
- High performance

---

# 4. Architecture Decisions

## Modular Architecture

**Decision**

The system is divided into Public, Shared, Student, Faculty, Admin, and Principal layers.

**Reason**

Improves maintainability, scalability, and role separation.

---

## Shared Core Modules

**Decision**

Modules such as Innovation Hub, Credit Engine, Review Engine, Leaderboard, and Portfolio are shared across all roles.

**Reason**

Avoids duplication and ensures a single implementation for common functionality.

---

## Service Layer Architecture

**Decision**

Business logic resides exclusively in service classes.

**Reason**

Keeps API routes lightweight, improves testability, and separates responsibilities.

---

## Repository Pattern

**Decision**

Database access is isolated within repository classes.

**Reason**

Decouples business logic from persistence and simplifies future database changes.

---

## Event-Driven Flow

**Decision**

Major business events trigger downstream updates automatically.

Example:

Project Approved

↓

Credit Engine

↓

Leaderboard

↓

Portfolio

↓

Analytics

**Reason**

Maintains data consistency and reduces duplicated update logic.

---

# 5. Database Decisions

## Single Production Database

**Decision**

Use one PostgreSQL database for Version 1.0.

**Reason**

Simplifies deployment, maintenance, and backups.

---

## Normalized Schema

**Decision**

Normalize data wherever practical.

**Reason**

Reduces duplication and preserves consistency.

---

## Soft Deletes

**Decision**

Use soft deletes for critical business entities.

**Reason**

Allows auditability and recovery of important records.

---

## UUID Strategy

**Decision**

Use UUIDs for public-facing entities where appropriate while retaining integer primary keys internally if beneficial for performance.

**Reason**

Improves security and flexibility for external APIs.

---

## Migration Strategy

**Decision**

All schema changes must be performed through Alembic migrations.

**Reason**

Ensures reproducible deployments and controlled database evolution.

---

## Indexing Strategy

**Decision**

Create indexes only for frequently queried columns.

**Reason**

Balance read performance with write efficiency.

Never create indexes without measuring their benefit.

# 6. Authentication Decisions

## Authentication Strategy

**Decision**

Use JWT (JSON Web Token) with Refresh Tokens for authentication.

**Reason**

- Stateless authentication
- Easy frontend integration
- Scalable architecture
- Secure session management

---

## Role-Based Access Control (RBAC)

**Decision**

Every authenticated user belongs to one primary role.

Supported roles:

- Student
- Faculty
- Admin
- Principal

**Reason**

Provides clear authorization boundaries and simplifies permission management.

---

## Authorization

**Decision**

Authorization must always be enforced on the backend.

The frontend should only control visibility of UI elements.

**Reason**

Frontend can never be trusted for security.

---

## Password Security

**Decision**

Passwords are never stored in plain text.

Use modern hashing algorithms (bcrypt via Passlib).

**Reason**

Protect user credentials in the event of database compromise.

---

## Session Management

**Decision**

Support short-lived access tokens with longer-lived refresh tokens.

**Reason**

Balances usability with security.

---

## Future Authentication

Future versions may support:

- Google OAuth
- Microsoft Login
- College SSO
- Two-Factor Authentication (2FA)

These are outside Version 1.0.

---

# 7. API Decisions

## API Style

**Decision**

Use RESTful APIs for Version 1.0.

**Reason**

REST is simple, widely supported, easy to document, and sufficient for the platform's requirements.

---

## API Versioning

**Decision**

Every endpoint must be versioned.

Example:

```
/api/v1/projects
/api/v1/leaderboard
```

**Reason**

Allows future evolution without breaking existing clients.

---

## Response Format

**Decision**

Use a standardized response structure for all endpoints.

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {}
}
```

**Reason**

Provides consistency across frontend and backend.

---

## Validation

**Decision**

All request validation is performed using Pydantic schemas.

**Reason**

Ensures strong typing, automatic validation, and better API documentation.

---

## Error Handling

**Decision**

Implement centralized exception handling.

**Reason**

Produces predictable API responses and simplifies debugging.

---

## Pagination

**Decision**

Paginate all endpoints returning collections.

**Reason**

Improves performance and reduces unnecessary data transfer.

---

## Documentation

**Decision**

Maintain automatic OpenAPI documentation through FastAPI.

**Reason**

Keeps API documentation synchronized with implementation.

---

# 8. Frontend Decisions

## Framework

**Decision**

Use React with TypeScript.

**Reason**

Provides modular architecture, type safety, and long-term maintainability.

---

## Build Tool

**Decision**

Use Vite.

**Reason**

Fast development server, optimized builds, and modern tooling.

---

## Routing

**Decision**

Use React Router for client-side routing.

**Reason**

Supports nested layouts and role-based navigation.

---

## State Management

**Decision**

Separate server state and client state.

Server State:

- TanStack Query

Client State:

- Zustand

**Reason**

Reduces complexity and improves scalability.

---

## Forms

**Decision**

All forms must use controlled components with schema-based validation.

**Reason**

Improves consistency and user experience.

---

## Component Philosophy

**Decision**

Build small, reusable, feature-driven components.

**Reason**

Simplifies maintenance and reduces duplication.

---

## Responsive Design

**Decision**

Mobile-first responsive development.

**Reason**

Most students will access CRCE OS using mobile devices.

---

# 9. UI Decisions

## Design Language

**Decision**

Adopt a consistent visual identity inspired by:

- 70% Linear
- 20% Stripe
- 10% Notion

**Reason**

Creates a modern, minimal, and professional interface.

---

## Design System

**Decision**

Maintain a single reusable component library.

**Reason**

Ensures visual consistency and faster development.

---

## Existing UI

**Decision**

The current Stitch-generated UI is the foundation for Version 1.0.

**Reason**

Development effort should focus on integration rather than redesign.

---

## Accessibility

**Decision**

Target WCAG 2.1 AA compliance.

**Reason**

Ensure the platform is usable by all users.

---

## Theme

**Decision**

Support Light Mode in Version 1.0.

Dark Mode may be introduced in a future release.

---

## Responsiveness

**Decision**

Every page must function across:

- Mobile
- Tablet
- Laptop
- Desktop

---

## Navigation

**Decision**

Navigation adapts to user roles while preserving shared modules.

**Reason**

Maintains a consistent experience across the platform.

---

# 10. Business Logic Decisions

## Credit Engine

**Decision**

The Credit Engine is the only system responsible for calculating contribution scores.

**Reason**

Prevents duplicate scoring logic and guarantees consistency.

---

## Leaderboard

**Decision**

The Leaderboard never calculates rankings.

It only displays data received from the Credit Engine.

**Reason**

Maintains a single source of truth.

---

## Portfolio

**Decision**

Portfolios are automatically generated from verified platform activity.

Users cannot manually add verified achievements.

**Reason**

Ensures authenticity and credibility.

---

## Review Engine

**Decision**

Credits are awarded only after successful faculty review and approval.

**Reason**

Prevents unverified work from influencing rankings or portfolios.

---

## Shared Modules

**Decision**

Shared modules must remain role-agnostic.

Role-specific behavior should be controlled through permissions and UI, not duplicate implementations.

**Reason**

Reduces maintenance overhead and ensures consistent business logic.

---

## Innovation Lifecycle

**Decision**

Every project must follow the predefined lifecycle:

```
Problem
↓

Team Formation
↓

Project Development
↓

Faculty Review
↓

Credit Allocation
↓

Leaderboard Update
↓

Portfolio Generation
```

**Reason**

Maintains consistency across all innovation activities and ensures every contribution is traceable.

# 11. Deployment Decisions

## Deployment Strategy

**Decision**

Deploy CRCE OS on the college-managed server using Docker containers.

**Reason**

- Consistent environments
- Easy deployment
- Simplified maintenance
- Future scalability
- Easy rollback

---

## Containerization

**Decision**

Every major service should run inside its own container.

Services include:

- Frontend
- Backend
- PostgreSQL
- NGINX

**Reason**

Improves isolation and maintainability.

---

## Reverse Proxy

**Decision**

Use NGINX as the reverse proxy.

**Reason**

- HTTPS support
- Static file serving
- Load balancing
- Security headers
- Compression

---

## Environment Configuration

**Decision**

All configuration must come from environment variables.

Never hardcode:

- Secrets
- API Keys
- Database Credentials
- JWT Keys

**Reason**

Improves security and deployment flexibility.

---

## Logging

**Decision**

Maintain centralized application logs.

Log:

- API Requests
- Authentication Events
- Business Events
- Errors

Never log:

- Passwords
- JWT Tokens
- Personal Information
- Secrets

---

## Backup Strategy

**Decision**

Schedule automatic PostgreSQL backups.

Maintain:

- Daily Backup
- Weekly Backup
- Monthly Backup

**Reason**

Protect institutional data from accidental loss.

---

# 12. Security Decisions

## Security Philosophy

**Decision**

Security is designed into the system from the beginning rather than added later.

**Reason**

Prevent vulnerabilities instead of reacting to them.

---

## Authentication

**Decision**

Every protected endpoint requires valid authentication.

**Reason**

Unauthorized users should never access protected resources.

---

## Authorization

**Decision**

Every request must verify:

Authentication

↓

Role

↓

Permission

↓

Ownership (when applicable)

**Reason**

Prevents privilege escalation.

---

## Input Validation

**Decision**

Validate every request received by the backend.

Including:

- Request Body
- Query Parameters
- URL Parameters
- File Uploads

**Reason**

Protects against malicious input.

---

## Database Protection

**Decision**

Use SQLAlchemy ORM and parameterized queries exclusively.

**Reason**

Prevents SQL Injection.

---

## File Uploads

**Decision**

Accept only approved file types.

Validate:

- Extension
- MIME Type
- File Size

Future versions may include virus scanning.

---

## Audit Trail

**Decision**

Maintain audit logs for important actions.

Examples:

- Login
- Problem Creation
- Reviews
- Credit Updates
- Admin Operations

---

# 13. Performance Decisions

## Performance Philosophy

**Decision**

Build for maintainability first, optimize after measuring.

**Reason**

Avoid premature optimization and unnecessary complexity.

---

## Frontend Performance

**Decision**

Implement:

- Lazy Loading
- Route Splitting
- Image Optimization
- Code Splitting
- Asset Compression

---

## Backend Performance

**Decision**

Optimize:

- Database Queries
- Service Logic
- Background Tasks
- API Responses

---

## Database Performance

**Decision**

Use:

- Proper Indexes
- Query Optimization
- Pagination
- Connection Pooling

Avoid:

- N+1 Queries
- Full Table Scans
- Duplicate Reads

---

## Caching

**Decision**

Version 1.0 uses minimal caching.

Future versions may introduce Redis where measurable performance benefits exist.

---

## Monitoring

**Decision**

Monitor:

- Response Times
- Error Rates
- Database Performance
- Resource Usage

Performance improvements should always be based on real metrics.

---

# 14. Future Decisions

These decisions are intentionally deferred until after Version 1.0.

They should not influence current implementation.

---

## Planned Enhancements

- Mobile Application
- Progressive Web App (PWA)
- Multi-College Support
- AI Assistant
- AI Project Recommendations
- AI Review Assistance
- Alumni Portal
- Startup Incubator
- Internship Portal
- Placement Portal
- Patent Management
- Industry Collaboration Portal
- ERP Integration
- Public API
- Real-Time Collaboration
- WebSocket Support
- Redis Caching
- Microservices Architecture

---

## Guiding Principle

Version 1.0 should prioritize:

- Stability
- Maintainability
- Simplicity
- Complete Feature Set

Future complexity should only be introduced when justified by real usage.

---

# 15. Architecture Decision Records — Backend V1

These five ADRs were resolved on 2026-08-11 during the final architecture
freeze before backend implementation. They are FINAL for V1. This section is
the canonical record; `docs/BACKEND_ARCHITECTURE.md` §47 summarizes them.

---

## ADR-1 — Application Automatically Creates Project

**Status:** ACCEPTED

**Context**

The frozen frontend provides apply/withdraw for students and renders existing
projects, but has no surface where faculty accept or reject an application. A
separate approval stage would be invisible and unusable in the current UI, yet
without a defined moment of project creation no journey can start.

**Decision**

A successful student application atomically creates the corresponding Project
record in the same transaction. The project's mentor is the problem's faculty
author. The IDEA stage becomes available immediately.

```
Student → Application → Project automatically created → IDEA stage available
```

The backend must still validate, before creating the application/project pair:

- student eligibility (role, active status, same institution)
- problem availability (status `open`)
- duplicate application (one per student per problem)
- institution ownership
- team membership rules (team applications: caller is a member; team belongs
  to the same problem)
- valid stage transition (journey starts at IDEA/draft)

Withdrawal remains available while the project's IDEA stage is still a draft;
withdrawing soft-deletes the project.

**Consequences**

- No faculty "accept application" workflow exists in V1; do not build one.
- The application endpoint carries the full validation burden.
- Quality gating happens where the frontend already puts it: stage reviews.

**Alternatives Considered**

- Faculty accept/reject step that creates the project on acceptance —
  rejected: the current frontend cannot render it, and it adds a gate the
  product does not define.

---

## ADR-2 — Institution Tenancy From V1

**Status:** ACCEPTED

**Context**

The pilot is a single college, but the product is a multi-tenant SaaS.
Retrofitting tenant isolation after launch is a rewrite of every query and
authorization check.

**Decision**

All institution-owned resources are institution-scoped from V1: users,
problems, applications, teams, team memberships, projects, stage submissions,
reviews, credit records, notifications, analytics. Every protected query
filters by the caller's `institution_id` (from the JWT), centralized in a
repository-layer helper. Cross-institution access must be impossible through
authorization checks — an Institution A user must never access Institution B's
protected resources (scoped reads return 404).

**Consequences**

- The pilot ships with one seeded institution; adding a second is a data row,
  not a refactor.
- Admin operates cross-institution as platform operator; principal is scoped
  to their own institution.
- Isolation is not postponed to the SaaS version.

**Alternatives Considered**

- Global (unscoped) public surfaces and single-tenant schema until SaaS —
  rejected: riskier data boundaries, guaranteed rework.

---

## ADR-3 — Mentor-Only Review Authority

**Status:** ACCEPTED

**Context**

The review engine needs an authorization rule: any faculty, or only the
project's mentor? The frontend's single-faculty demo cannot distinguish, but
queue items carry the mentor's identity.

**Decision**

For V1, only the assigned project mentor performs stage reviews for the
project — IDEA, POC, SELECTION, and FINAL PROJECT wherever the current
workflow requires review. Review queues are filtered to
`projects.mentor_id = caller`.

Do not introduce review pools, external reviewers, admin reassignment, or
multiple-reviewer workflows. The single `reviewed_by` column and the
authorization module leave room for future expansion without schema churn.

**Consequences**

- Simple, auditable authorization: one predicate (`is_project_mentor`).
- A mentor's absence blocks their projects' reviews — acceptable at pilot
  scale; reassignment is a future decision, not a V1 feature.

**Alternatives Considered**

- Department-wide review pools — rejected: broader access, harder to audit,
  not required by the current frontend.

---

## ADR-4 — One Team Per Student Per Problem

**Status:** ACCEPTED

**Context**

The mock's `mine` flag implies one own team overall, but teams are formed
around a problem and the catalog encourages multi-problem participation.

**Decision**

A student may participate in multiple problems. For each individual problem, a
student may belong to at most one team.

Valid: Student A in Team Alpha (Problem 1), Team Beta (Problem 2), solo
(Problem 3). Invalid: Student A in two teams on the same problem.

Enforcement is dual: `team_members` carries a denormalized `problem_id`
(copied from its team) with `UNIQUE(student_id, problem_id)` at the database
level, and the service layer validates team↔problem consistency inside the
seating transaction.

There is no global one-team-per-student restriction and no separate Team
Profile domain. Team remains a workflow entity: identity, problem
relationship, members, leader, and its application/project relationship.

**Consequences**

- Multi-problem participation works as the catalog implies.
- The DB constraint makes the rule race-proof (concurrent joins/invitations
  cannot double-seat a student on one problem).

**Alternatives Considered**

- One active team globally (the mock's literal behavior) — rejected: blocks
  multi-problem participation.
- Service-layer-only enforcement — rejected: racy under concurrent seating.

---

## ADR-5 — Shared Credit Engine With Configurable Faculty Rules

**Status:** ACCEPTED

**Context**

The leaderboard ranks faculty by credits, but the seeded `CREDIT_RULES` are
student-oriented. Faculty need a credit source without creating a second
scoring system.

**Decision**

Faculty and students use the SAME Credit Engine: one credit transaction
system, one source of truth. Credit rules are configurable/seeded rows, not
hardcoded logic:

```
credit_rules(role, event_type, points, description, active,
             effective_from, effective_to)
```

V1 implements only events the current product represents. Faculty events:

- `PROBLEM_PUBLISHED`
- `REVIEW_COMPLETED`
- `MENTORED_PROJECT_COMPLETED`

Research publication, industry collaboration, and student-success impact are
future extensions — do not implement them in V1.

The flow is: Verified Activity → Credit Rule → Credit Transaction → Credit
Balance → Leaderboard / Portfolio / Analytics. Duplicate awards are prevented
by a unique event key on transactions (`UNIQUE(user_id, source, source_id)`).
Corrections are compensating transactions (admin-only, audited), never edits.

**Consequences**

- One auditable ledger serves student leaderboard, faculty leaderboard,
  portfolio, dashboards, and analytics — none of them compute credits
  independently.
- Rule changes are data changes (seed/config), not code changes.

**Alternatives Considered**

- Ranking faculty by raw activity counts — rejected: violates "leaderboard
  derives from the Credit Engine".
- A separate faculty credit system — rejected: duplicate source of truth.

---

## ADR-6 — Globally Unique User Email

**Status:** ACCEPTED

**Context**

`users` carries `institution_id`, and §12 of the architecture originally
specified `UNIQUE(institution_id, email)`. Authentication, however, is
email-and-password only: `POST /api/v1/auth/login` receives `{email, password}`
and nothing else. The frontend `LoginPage` has no institution selector, and
`API_SPEC.md` defines no institution field on the login request.

With a composite constraint, one address could exist at two institutions and the
login lookup would be ambiguous. Every way of resolving that ambiguity is worse
than avoiding it: asking the user to pick an institution changes the frozen
frontend contract, inferring it from the email domain breaks for shared domains
(gmail), and returning the first match silently authenticates the wrong identity.

**Decision**

`users.email` is UNIQUE platform-wide (`uq_users_email`), enforced by the
database. `institution_id` remains on the row and remains the tenancy key for
every other query; it is indexed via `ix_users_institution_id_role`.

Email is normalised to lowercase at the model layer (`@validates("email")`) so
the constraint and the login lookup can never disagree about case.

This constraint is strictly stronger than `UNIQUE(institution_id, email)` — it
satisfies the architecture's requirement and adds to it.

**Consequences**

- One email address = one identity, platform-wide. Login is unambiguous.
- `get_by_email` is the only repository function not scoped by institution, by
  necessity: it runs before any institution context exists.
- A person who belongs to two institutions needs two addresses. Acceptable: the
  pilot is single-institution, and the multi-tenant direction is one account per
  campus identity anyway.
- Institution transfer is an `UPDATE users SET institution_id`, not a new row.

**Alternatives Considered**

- `UNIQUE(institution_id, email)` with an institution selector on the login
  form — rejected: changes the frozen frontend contract for no security gain.
- `UNIQUE(institution_id, email)` with domain-based inference — rejected:
  unreliable for shared domains, and it makes tenancy depend on a string the
  user controls.
- Composite constraint plus "first match wins" — rejected: silently
  authenticates the wrong identity. Fails the fail-safe rule.

---

## ADR-7 — Readiness Endpoint Is `/health/db`

**Status:** ACCEPTED

**Context**

Phase 1 shipped two health endpoints: `GET /api/v1/health` (liveness, never
touches the database) and `GET /api/v1/health/db` (readiness, 503 when the
database is unreachable). §35 of the architecture refers to the readiness probe
as `/health/ready`.

The endpoint is implemented, tested and already referenced by the deployment
notes. The difference is a name, not behaviour.

**Decision**

Keep `GET /api/v1/health/db`. The architecture document is corrected to match
the implementation; the implementation is not renamed.

**Consequences**

- No change to running code, tests, or the Docker healthcheck.
- `/health/db` is arguably the more accurate name: it states what is probed.
- If a future orchestrator convention demands `/health/ready`, it can be added
  as an alias rather than a rename.

**Alternatives Considered**

- Renaming the endpoint to `/health/ready` — rejected: churn in tests and
  deployment config to satisfy a naming preference, with a window where a stale
  probe URL reports a false outage.
- Serving both paths now — rejected: two names for one probe invites drift.

---

## ADR-8 — Bearer Token Transport, No Cookie/CSRF Model

**Status:** ACCEPTED

**Context**

`API_SPEC.md` defines `POST /api/v1/auth/login` as returning
`{access_token, refresh_token, user}` in the response body, and the frontend API
client stores an access token via `setAccessToken` and sends it as
`Authorization: Bearer`. The architecture permits either an httpOnly cookie or
the body for the refresh token.

**Decision**

Both tokens are transported in the JSON response body and presented in the
`Authorization` header. **The platform does not use cookie-based sessions and
therefore has no CSRF protection, because it needs none: no credential is
attached automatically by the browser.** No httpOnly, Secure or SameSite cookie
protection is claimed or implemented.

**Consequences**

- Honest security posture: tokens live wherever the frontend stores them.
  Storage in `localStorage` is readable by any script running on the origin, so
  **XSS on the frontend is a token-theft vector.** The mitigations are the
  standard ones — React's default escaping, no `dangerouslySetInnerHTML` on
  user content, and a CSP at the NGINX layer — not cookie flags.
- Blast radius is bounded by design: access tokens expire in 15 minutes, refresh
  tokens rotate on every use, and replaying a rotated refresh token revokes the
  entire token family for that user.
- No CSRF tokens, no double-submit cookie, no SameSite reasoning anywhere in the
  codebase — there is no ambient credential for an attacker's site to ride.
- `allow_credentials=True` on the CORS middleware is vestigial in this model;
  the explicit origin allowlist is what matters.

**Alternatives Considered**

- httpOnly refresh cookie + in-memory access token — genuinely stronger against
  XSS, and the likely V2 direction. Rejected for V1: it contradicts the frozen
  `API_SPEC.md` and frontend client, and it requires CSRF machinery
  (double-submit or SameSite=Strict plus origin checks) that the frozen frontend
  has no code for.
- Access token in the body, refresh token in a cookie — rejected: the hybrid
  carries the CSRF obligation of cookies with the XSS exposure of body tokens.

---

## ADR-9 — Isolated Per-Institution Deployment, No Central Control Plane

**Status:** ACCEPTED

**Context**

ProjectConnect OS is sold as a SaaS product, but colleges expect their academic
data — students, faculty, problems, teams, projects, reviews, credits,
portfolios, institutional analytics — to stay on infrastructure they control.
The pilot is a single college (CRCE). Phase 2 shipped institution-scoped
authorization (ADR-2) that would also support several institutions inside one
database, which left an unstated question: is the product one shared
installation with many tenants, or many installations with one tenant each?

**Decision**

ProjectConnect uses an isolated per-institution deployment model for the initial
SaaS deployment. Each institution operates its own ProjectConnect application
instance and PostgreSQL database on its own infrastructure. Institutional
academic data remains within that deployment.

```
ONE COLLEGE = ONE DEPLOYMENT = ONE POSTGRESQL DATABASE = ONE INSTITUTION
```

The deployment carries three identity/lifecycle values, all local:

| Value | Where it lives | Purpose |
|---|---|---|
| Institution identity | `institutions.id` (+ `code`) | names the college |
| Deployment identity | `DEPLOYMENT_ID` environment variable | names *this* installation |
| Lifecycle / licence state | `institutions.status` (ACTIVE / PENDING / SUSPENDED) | gates authentication |

`institutions.status` is enforced at login and at refresh: a non-ACTIVE
institution cannot authenticate, and suspending one ends live sessions within an
access-token lifetime. This is the local half of a future licensing story, and
it is the *only* half being built now.

Centralized licensing and deployment management may be introduced in a future
version, but are intentionally outside the scope of the initial pilot. No
central licence server, no network licence check, no telemetry, and no new
dependency is introduced for licensing. **The college deployment must remain
fully functional when ProjectConnect's future central services are unavailable,
which today is trivially true because no such call exists.**

**Consequences**

- Data ownership is structural, not contractual: there is no code path that can
  send academic data to a ProjectConnect-operated service, so the guarantee
  cannot be violated by configuration.
- Availability is unaffected by anything ProjectConnect operates. An outage at
  the vendor is invisible to the college.
- Institution isolation (ADR-2) is retained even though the pilot database holds
  one institution row. It is defence in depth and the seam that would let a
  shared deployment exist later without re-auditing every query. Nothing in the
  code assumes exactly one institution row, and no single-row constraint is
  added.
- Upgrades, backups and restores are per-college operations. This is the real
  cost: `N` colleges means `N` upgrade windows and `N` backup jobs. Acceptable
  at pilot scale; it is what a control plane would later automate.
- Adding a licence registry later is additive — a client that reports
  `DEPLOYMENT_ID` and sets `institutions.status` — and requires no schema
  redesign and no change to how authentication reads that status.

**Reaffirmed in Phase 14 (2026-08-20).** Phase 14 was briefed as "SaaS /
multi-institution" and its literal reading — shared tenant database,
platform-operator role, cross-institution reads, a provisioning API,
inter-institution ranking — is the alternative this ADR rejects. The conflict
was raised as a decision rather than resolved in code, and the decision was to
keep ADR-9 unreversed. This ADR is **not superseded**; there is no ADR-11.

What Phase 14 built inside it: `GET /institutions` (the caller's own
institution, one row), `PATCH /institutions/me` (profile self-service) and the
anonymous `GET /analytics/campus-impact` (four aggregate integers over ACTIVE
institutions). What it declined to build, and why each is this ADR's direct
consequence rather than a deferral:

| Asked for | Not built because |
|---|---|
| Institution provisioning API | Creating a college is creating a *deployment*. It stays at installation, in `scripts/create_admin.py`. |
| Platform-operator role | `UserRole` has four institution roles and gains no fifth. An operator with authority over institutions is the control plane this ADR refuses. |
| Institution status management from the console | `status` gates authentication. A suspended institution cannot sign in, so it cannot un-suspend itself; that is the mechanism working. |
| Institution count / platform snapshot | Counting institutions needs institutions this deployment cannot see. |
| Inter-institution ranking | Permanently closed, not deferred: ranking needs a second tenant, and a second tenant is a second database. |

The audit also confirmed the isolation this ADR relies on: no route accepts a
client-supplied `institution_id` as authority, every tenant-owned query derives
scope from `current_user.institution_id`, and cross-institution reads answer 404.
`backend/tests/test_institutions_phase14.py` exercises both directions with the
two-institution fixtures.

**Alternatives Considered**

- **Shared multi-tenant installation** (one database, many institutions).
  Rejected for the pilot: it puts several colleges' academic records in one
  blast radius, makes data ownership a policy promise rather than a physical
  fact, and colleges asked for on-premise. The authorization work that would
  make it safe is already done and is being kept.
- **Central licence server checked at startup or per login.** Rejected: it
  creates exactly the dependency the deployment model exists to avoid — a vendor
  outage or a firewalled campus network would lock a college out of its own
  data. Also premature: there is one pilot customer.
- **Per-college database, single shared app instance.** Rejected: shared
  compute reintroduces a shared failure domain and cross-college blast radius
  for a saving that does not matter at pilot scale.
- **`deployment_id` as a database column on `institutions`.** Rejected: the
  deployment is a property of the installation, not of a row. An environment
  value cannot be duplicated by a bad restore into another box's database, and
  it needs no migration.

---

## ADR-10 — Faculty Project Award Share

**Status:** ACCEPTED (2026-08-16)

**Context**

ADR-5 priced mentorship as a flat `MENTORED_PROJECT_COMPLETED` rule: 60 credits
whenever a mentored project completed, regardless of how good the project was.
Faculty rankings therefore measured how many projects a mentor finished, not
what those projects were worth, while the mentor is the person who decides the
award. Mentorship is also the one faculty event whose value is already
quantified elsewhere — `credit_awards.total`, the number the mentor has just
justified across five rubric components.

The alternative under discussion, a faculty "reputation score" (review quality,
feedback depth, approval rate, on-time review, innovation contribution), would
have been a second scoring system with no verified inputs behind it.

**Decision**

Mentoring a project to completion is priced as a percentage of that project's
credit award. Four sub-decisions, all final:

- **Replace, do not stack.** The award share replaces the flat fee.
  `MENTORED_PROJECT_COMPLETED` is set `active = false`; the row is preserved so
  history stays readable. The two rewards never both pay.
- **The base is the award, not the payout.** The share is a percentage of
  `credit_awards.total`, never of the sum of the students' ledger lines. A
  100-credit award pays the mentor 50 credits whether the team has one member
  or six.
- **The rate is configuration.** `credit_rules` gains a nullable
  `percent_of_award`; `points` becomes nullable, with
  `CHECK ((points IS NULL) <> (percent_of_award IS NULL))` so every rule prices
  its event exactly one way. The seeded faculty rule `MENTOR_AWARD_SHARE` is
  50%, with the existing `active` / `effective_from` / `effective_to`
  semantics. No percentage appears in application code.
- **Cumulative, then delta, rounded down.**
  `cumulative = floor(total * rate / 100)`;
  `already_paid = SUM(points)` of the mentor's `Mentorship` transactions keyed
  to this project's awards; `delta = cumulative - already_paid`. A non-zero
  delta writes exactly one row (`user_id = projects.mentor_id`,
  `source = "Mentorship"`, `source_id = <current award id>`); a zero delta
  writes nothing. A revision from 100 → 120 → 101 → 200 pays
  `+50, +10, −10, +50` and leaves the mentor holding `floor(200 × 50 / 100)`.

The share is emitted inside `award()`, in the same transaction as the students'
credits, so the whole award lands or none of it does. The recipient is read
from `projects.mentor_id` — never from a request body — and the base is the
database's stored `total`, never the components typed into the request.

Two things this decision explicitly does **not** authorise:

- **No faculty reputation engine.** No reputation table, no
  `/faculty/me/reputation`, and no seeded Review Quality / Feedback Depth /
  Approval Rate / On-time Review / Mentorship Score / Innovation Contribution
  values. The faculty leaderboard remains `SUM(credit_transactions.points)`.
- **No public portfolio route.** "Public" in V1 means visible to authenticated
  members of the same institution, not to the internet. There is no
  `GET /portfolio/{userId}` and no portfolio customization API beyond what
  already exists; institution isolation (ADR-2) still applies to every read.

**Consequences**

- Faculty credits now track the quality of what was mentored, on one ledger,
  with no second scoring path. Leaderboard and portfolio remain pure read
  models over `credit_transactions` and were not modified.
- Student credits are untouched: the students' lines, their totals, and their
  leaderboard scores are exactly what they were before this change.
- History is not rewritten. Existing `MENTORED_PROJECT_COMPLETED` transactions
  stay as they are and are not backfilled to the new scheme; `already_paid` is
  keyed on award ids, so those older rows can never be double-counted or
  clawed back.
- A mentor's own share scales with the award they choose. The existing award
  ceiling (`base_credits`-derived) is what bounds it; there is no separate cap.
- `GET /credits/rules` lists flat-priced rules only. A percentage has no credit
  value until an award exists, and `CreditRule.points` in the frozen
  `domain.ts` is a required number, so the share is not a row on that list. It
  is visible where it is paid: the mentor's ledger.
- `earn()` ignores percentage rules by construction (`rule.points is None`), so
  no flat-event path can accidentally pay a share.

**Alternatives Considered**

- **Stacking the share on top of the flat 60.** Rejected: two rewards for one
  event, and the flat component would keep rewarding volume over quality.
- **Sharing the students' payout instead of the award total.** Rejected: the
  mentor's credit would depend on team size, so mentoring a solo project would
  be worth six times mentoring a six-person one.
- **Hardcoding 50% in `award()`.** Rejected: rules are data, not code (ADR-5).
- **Recomputing and editing the mentor's earlier transaction on revision.**
  Rejected: the ledger is append-only; corrections are compensating rows.
- **A faculty reputation score.** Rejected: a second source of truth for
  faculty standing, built on numbers no verified activity produces.

---

# 16. Decision Log

The Decision Log records significant architectural or engineering changes made during the project's lifecycle.

Each entry should include:

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|

---

## Initial Decisions (Version 1.0)

| Decision | Rationale |
|-----------|-----------|
| FastAPI selected as backend framework | High performance, modern Python ecosystem, automatic OpenAPI support |
| React + TypeScript selected for frontend | Component-based architecture, strong typing, maintainability |
| PostgreSQL selected as primary database | Reliable relational database with strong ACID guarantees |
| SQLAlchemy + Alembic selected | Mature ORM with robust migration support |
| TailwindCSS + shadcn/ui selected | Consistent, reusable design system |
| JWT Authentication selected | Stateless, scalable authentication mechanism |
| Role-Based Access Control implemented | Clear separation of permissions across Student, Faculty, Admin, and Principal |
| Modular Architecture adopted | Improves scalability and maintainability |
| Credit Engine designated as Single Source of Truth | Prevents duplicate scoring logic across the platform |
| Shared Leaderboard adopted | One leaderboard with Student/Faculty toggle, driven entirely by the Credit Engine |
| Auto-Generated Portfolio adopted | Portfolios generated only from verified platform activity |
| Docker-based deployment selected | Consistent deployments across environments |
| NGINX selected as reverse proxy | HTTPS, security, static asset serving, and request routing |

---

## Backend V1 Architecture Freeze (2026-08-11)

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-11 | ADR-1: successful application automatically creates the Project | No faculty accept-application surface exists in the frozen frontend | Application endpoint validates everything; journey starts at IDEA immediately | CRCE OS Team |
| 2026-08-11 | ADR-2: institution tenancy enforced from V1 | Retrofitting isolation is a rewrite; SaaS is the product direction | Every protected query institution-scoped; cross-tenant access impossible | CRCE OS Team |
| 2026-08-11 | ADR-3: mentor-only stage review for V1 | Simplest auditable authority matching the current workflow | Review queues filtered to the project mentor; no pools/reassignment | CRCE OS Team |
| 2026-08-11 | ADR-4: one team per student per problem | Teams form around problems; multi-problem participation is intended | DB-enforced UNIQUE(student, problem) on membership | CRCE OS Team |
| 2026-08-11 | ADR-5: shared Credit Engine with configurable faculty rules | One source of truth; rules as data, not code | `credit_rules` seeded; faculty events limited to current product | CRCE OS Team |

Full records with context, consequences, and alternatives: §15 above.

---

## Backend Phase 2 — Security & Identity (2026-08-12)

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-12 | ADR-6: `users.email` is globally unique | Login is email-only, so one address must resolve to one identity | `uq_users_email`; emails normalised to lowercase; strictly stronger than UNIQUE(institution_id, email) | CRCE OS Team |
| 2026-08-12 | ADR-7: readiness probe stays `/health/db` | Endpoint is implemented and tested; the difference is a name, not behaviour | §35 of the architecture corrected to match the implementation | CRCE OS Team |
| 2026-08-12 | ADR-8: bearer tokens in the response body, no cookie/CSRF model | Matches the frozen API_SPEC and frontend client | No CSRF protection is needed or claimed; XSS is the token-theft vector, mitigated by 15-min access tokens and refresh rotation | CRCE OS Team |

### Backend Pilot Deployment Model (2026-08-12)

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-12 | ADR-9: one college = one deployment = one database = one institution | Colleges own their academic data; on-premise was the stated requirement | `DEPLOYMENT_ID` env value added; institution status enforced at login/refresh; institution scoping (ADR-2) retained as defence in depth | CRCE OS Team |
| 2026-08-12 | No central licence server in the pilot; local `institutions.status` only | A network licence check would lock a college out of its own data during a vendor or network outage | Architecturally prepared, not built: adding a registry later is additive | CRCE OS Team |

Full records with context, consequences, and alternatives: §15 above.

---

## Credit Engine Amendment — Faculty Credit Policy (2026-08-16)

An amendment to the Credit Engine, not a phase of its own. It changes how one
existing faculty rule is priced; it adds no module, endpoint or roadmap step.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-16 | ADR-10: mentorship is paid as a share of the credit award, replacing the flat `MENTORED_PROJECT_COMPLETED` fee | Faculty credit should track what was mentored, not how many projects finished | `credit_rules.percent_of_award` added; `MENTOR_AWARD_SHARE` = 50% seeded; flat rule set inactive but preserved | CRCE OS Team |
| 2026-08-16 | The share is a percentage of `credit_awards.total`, paid cumulative-then-delta with floor rounding | Mentor credit must not vary with team size, and the ledger is append-only | One `Mentorship` row per award when the delta is non-zero; revisions post the difference, positive or negative; no history rewritten or backfilled | CRCE OS Team |
| 2026-08-16 | No faculty reputation engine and no public portfolio route in V1 | A reputation score would be a second source of truth with no verified inputs; "public" means institution-visible, not internet-visible | `/faculty/me/reputation` and `GET /portfolio/{userId}` remain unimplemented; leaderboard and portfolio stay ledger-derived | CRCE OS Team |

Full record with context, consequences, and alternatives: §15 above.

---

## Student Dashboard (2026-08-16)

Phase 6. An aggregation module: one endpoint, no table, no migration, no new
business rule. Full field-by-field record in BACKEND_ARCHITECTURE.md §26.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-16 | `GET /dashboard/student` reads each counter from the module that owns it — balance from the Credit Engine, rank from the Leaderboard, membership from the projects repository | A dashboard that recomputes a number becomes a second source of truth for it | No credit sum, ranking or completion rule exists in `modules/dashboard`; its one query counts changes-requested submissions | CRCE OS Team |
| 2026-08-16 | "Pending Tasks" means stage submissions returned `CHANGES_REQUESTED` plus `PENDING` team invitations to the student | There is no `Task` entity and no deadline in v1; these are the only persisted records of work awaiting the student, and neither derives from a clock | The count is deterministic; no `Task` table, `due_date` column or deadline system was added | CRCE OS Team |
| 2026-08-16 | An unranked student's rank is `null`, and no deadline, trend or delta is served at all | A tier badge, a "+4%" or a due date with no source is fabricated data, whatever the mock showed | The dashboard cards lost their deltas and the "TOP 1%" badge; `deadlines()` returns `[]` and the Urgent Reviews rail degrades to its empty state | CRCE OS Team |
| 2026-08-16 | The frontend swap point composes `{ ...mockRepositories, ...apiRepositories }` | A repository is live exactly when its backend exists; the app is never half-migrated in a way a page can see | `repositories/api/` holds the dashboard only; the mocks stay intact for development | CRCE OS Team |

---

## Student Complete Workflow (2026-08-17)

Phase 7. An integration phase: the student journey moves from mock data onto the
existing endpoints. No module, table, migration or business rule was added.
Repository-by-repository record in BACKEND_ARCHITECTURE.md §28–§29.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-17 | The whole snake_case ↔ camelCase translation is one generic key converter (`api/case.ts`), not a mapper per endpoint | The read schemas already mirror `types/domain.ts` field for field, so per-endpoint mappers would be sixty copies of one rename, each free to drift | Every API repository is a thin call plus `camelize`/`decamelize`; `tests/test_api_casing.py` asserts the invariant the converter rests on across the whole OpenAPI schema | CRCE OS Team |
| 2026-08-17 | Eight repositories went live; `reviews`, `facultyProfile`, `notifications`, `admin` and `analytics` stay on the mock | A repository is live exactly when its backend exists, and the review queue is faculty surface — Phase 8, not this one | The student journey — problems, teams, projects, stages, credits, leaderboard, portfolio, solutions — reads and writes real data; no faculty review functionality was built | CRCE OS Team |
| 2026-08-17 | Where a live endpoint serves less than the mock did, the field comes back empty and the UI degrades; nothing is composed to fill the gap | A seeded skill list or a fabricated deployment badge is the same fabrication whether it comes from a mock or from a repository | Portfolio prose, hall of fame, verified skills and timeline render empty; `Solution.status` and `campusUsers` became optional and are omitted; an unranked portfolio shows `—`, not `#0` | CRCE OS Team |
| 2026-08-17 | Portfolio rank is read from the leaderboard board the user appears on; portfolio customization stays in-session | The leaderboard is already the Credit Engine's ranking surface, so reading it introduces no second ranking; no customization endpoint exists to make authoritative | `portfolio` composes two live reads and delegates `getCustomization`/`updateCustomization` to the mock; Portfolio remains read-only, Profile remains the only editing surface | CRCE OS Team |

---

## Faculty Dashboard (2026-08-18)

Phase 8. The faculty sibling of Phase 6: one endpoint, no table, no migration, no
new business rule. `GET /dashboard/faculty`, faculty-only, no parameters.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-18 | "Credits Awarded" means credits this mentor *gave out* — `SUM(credit_awards.total)` over their live awards — not their own balance | The rail measures mentoring output; the mentor's balance is already the number their Credits page shows, and showing it twice under two names would make one of them wrong | One read accessor added to the Credit Engine repository (`awarded_total_by`); superseded revisions are excluded, so a revised award counts once at its new value | CRCE OS Team |
| 2026-08-18 | Three of the four metrics are counted off one canonical list — the projects the projects module says this person mentors | A dashboard that asks its own question of the database gets its own answer, and eventually a different one from the module that owns the fact | `projects_mentored` is that list's length, `students_guided` its deduplicated roster via `members_by_project`, `solutions_published` its `Project.published` flag; the dashboard defines no membership, publication or lifecycle rule | CRCE OS Team |
| 2026-08-18 | The Pending Review Queue and Recent Activity stay mock-backed | `GET /reviews/queues` exists but wiring the frontend `reviews` repository is Faculty Complete Workflow, not this phase; no canonical activity source exists at all | The impact rail is live while the review queue and activity feed still read the mock — visible on one page, and preferable to a dashboard that quietly reports two kinds of truth as one | CRCE OS Team |

---

## Faculty Complete Workflow (2026-08-18)

Phase 9. The only phase so far that added no backend at all: the Review Engine's
five routes, their schemas and their rules were already complete and untouched.
The gap was one missing file on the frontend — `reviews` was the last repository
the faculty workflow needed and the only one still on the mock.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-18 | No new endpoint, no migration, no UI change — one API repository | `ReviewRepository` already declared all five methods with the right signatures, and every endpoint the faculty workflow needs already existed; the pages, hooks and components were written against that interface and never knew which side answered | The queue, the pending count, the review detail and all five actions went live by adding `reviews: reviewsApiRepository` to `apiRepositories` | CRCE OS Team |
| 2026-08-18 | The three queue-schema mismatches are renamed at the repository, not in components | `id`/`attachment_count`/nullable `problem_title` differ from the domain type; translating in the panel would spread the wire format across the UI and make a backend rename a multi-file change | One `toQueueItem` function owns the difference; a contract test asserts the exact field set the backend sends | CRCE OS Team |
| 2026-08-18 | The decision body is built field-by-field, so `reviewedBy` cannot reach the wire | The panel's form carries a reviewer field and `ReviewDecisionIn` sets `extra="forbid"`; forwarding the form wholesale would be both a 422 and an attempt to name one's own reviewer | The reviewer is always the token's subject; a test posts `reviewed_by` and asserts 422 with the submission unmoved | CRCE OS Team |
| 2026-08-18 | Every mutation re-renders from the returned `ProjectJourney`, not from an optimistic guess | The verdict's meaning — what it unlocks, what it awards, whether it publishes — belongs to the Review and Credit Engines; a frontend that predicts it has invented a second copy of the rules | Actions feel a round-trip slower and are always right; `useFacultyReview` already reloaded on success, so nothing changed to get this | CRCE OS Team |
| 2026-08-18 | Going live drops the mock's student-facing notifications on decide/award/publish | No notification backend exists until Phase 12, and firing them from the frontend would put a platform event in the browser | A student is no longer told in-app that their stage was reviewed; a real regression, accepted rather than faked, and closed by Phase 12 | CRCE OS Team |

---

## Admin (2026-08-19)

Phase 10. The admin UI was drawn as a multi-institution SaaS console; the
backend is single-tenant by construction. Of the three pages, one — the user
directory — describes something this platform actually owns, and that is the
only one that went live. The other two were left on the mock rather than given a
tenant architecture Phase 14 has not designed yet.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-19 | `GET /users` was widened, not replaced by a new `/admin` router | The endpoint already existed with the right route, the right admin-only gate and the right token-derived scope; a second directory route would have been a second reader of the same table, and an `/admin` module would have owned state the users module owns | Zero new routers, zero renamed routes, and `test_authorization.py` keeps covering the directory unchanged | CRCE OS Team |
| 2026-08-19 | `credits` and `projects` each grew a batched accessor instead of the users module summing them | A directory row shows a balance and a project count, but neither is the users module's to define; copying `SUM(credit_transactions.points)` into `users/service.py` would have been a second source of truth, and asking per row would have been an N+1 | `credits.repository.balances_of` and `projects.repository.counts_for_students/counts_for_mentors` — one query each, definitions unmoved, the service only composes | CRCE OS Team |
| 2026-08-19 | `GET /users/overview` is the one new endpoint | The KPI tiles count the whole institution, but the directory is capped at `MAX_LIMIT=100`, so counting the loaded page would be wrong past the cap and would put the count in the browser | Six integers from two `GROUP BY`s; declared above `/users/{user_id}` so the path is not parsed as a uuid | CRCE OS Team |
| 2026-08-19 | The KPI tiles' fabricated figures were dropped, not recomputed | `'14,320 users'`, `'+2.4% vs LY'`, a verification backlog, `'Auth Gateway 99.99%'` and two audit lines had no canonical source; inventing backend calculations to keep the panels full is how a dashboard starts lying | Real counts in the tiles; the verification centre, identity health and audit log return empty and the page hides those three sections | CRCE OS Team |
| 2026-08-19 | The API admin repository spreads the mock before overriding two methods | `repositories/index.ts` spreads at repository level, so registering `admin` replaces the mock object whole — the six unbuilt methods would have gone undefined and broken two working pages | `{ ...mockRepositories.admin, users, usersOverview }`; the composition root was left exactly as it was | CRCE OS Team |
| 2026-08-19 | Institution management stays on the mock — it is Phase 14, not Phase 10 | Creating institutions, assigning principals and suspending tenants is provisioning for a multi-tenant platform; the backend has no writer, no list and deliberately 404s foreign ids, and building one here would have decided the SaaS architecture as a side effect of an admin page | Admin Institutions and the platform snapshot are unchanged and still mock-backed; the single-tenant boundary is intact | CRCE OS Team |
| 2026-08-19 | The directory's institution filter now offers one option, and that is correct | One token means one tenant, so every row shows the caller's own institution — the mock showed four because it was pretending to be a SaaS | An honest single-tenant directory instead of a filter implying data the admin cannot see | CRCE OS Team |

---

## Principal / Institution (2026-08-19)

Phase 11. The principal's two pages were drawn as an analytics console, and most
of what they show belongs to Phase 13 or Phase 14. Going live shrank them
visibly — half the tiles and four whole sections are gone rather than filled
with plausible figures. That is the trade, taken deliberately: a principal who
cannot trust one number on the page cannot trust any of them.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-19 | `GET /dashboard/principal` was added rather than an `analytics` module | The UI needs seven institution-wide counts and no endpoint in the platform returned a single one; a new module named for the thing Phase 13 will build would have been that phase arriving early | One read-only route, `require_role(PRINCIPAL)`, no parameters, scoped by the token — the third sibling of the student and faculty dashboards | CRCE OS Team |
| 2026-08-19 | `GET /users` and `/users/overview` stayed admin-exclusive | Relaxing an admin gate to ADMIN+PRINCIPAL would have given a second role the user directory to answer a question about counts; the principal's console shows numbers, not people | `test_principal.py` asserts a principal still gets 403 from both, so a future widening cannot pass silently | CRCE OS Team |
| 2026-08-19 | The aggregation owns nothing; every count came from the module that owns the thing counted | A second definition of "active project", "open problem" or "a credit" is the one thing a dashboard must never introduce | Four batched accessors added to their owners (`counts_by_completion`, `open_count`, `active_count`, `institution_total`); `counts_by_role` was reused as it stood | CRCE OS Team |
| 2026-08-19 | Department health, the growth chart, the radar and the highlights were emptied, not computed | Nothing attributes a project, a credit or a review to a department — there is no `Project.department`, and a problem's department is its author's, not its team's. No monthly snapshot is kept either | Both pages hide those sections; Phase 13 decides the attribution rule and the comparison window | CRCE OS Team |
| 2026-08-19 | The innovation health headline, institution rank, patents, publications and collaborations were dropped | A standing and a percentage need a past quarter to compare against; a rank needs another institution; the last three have no domain at all | The health hero is hidden and the totals take the full row; the rank tile is gone until Phase 14 can see more than one tenant | CRCE OS Team |
| 2026-08-19 | "Problems Solved" is not on the page, and `open_problems` filters on status anyway | `ProblemStatus.CLOSED` and `IN_PROGRESS` have no writer anywhere in `app/`, so a closed count would be a permanent zero — but the filter is still written, and tested against a row placed there directly, so it is correct the day a writer exists | Completed projects carry the "solved" tile instead, from the Credit Engine's `completed_at` | CRCE OS Team |
| 2026-08-19 | The API analytics repository spreads the mock before overriding `institution` | `repositories/index.ts` spreads at repository level, so registering `analytics` replaces the mock whole — `campusImpact` would have gone undefined and broken the Landing, About and Innovation Hub pages | `{ ...mockRepositories.analytics, institution }`; the composition root was left as it was | CRCE OS Team |
| 2026-08-19 | The tenant boundary was not touched | Phase 11 is a read of the caller's own institution; multi-institution provisioning is Phase 14's architecture, not a side effect of giving the principal a dashboard | No cross-tenant read, no new parameter, no migration — Alembic head unchanged | CRCE OS Team |

---

## Notifications + Audit (2026-08-19)

Phase 12. The audit half was already built: `audit_logs` has existed since the
foundation and twenty-five call sites across auth, problems, teams, projects,
reviews and credits have been writing to it all along. So the phase added no
audit table, no audit column and no audit write — only the two reads the UI
asks for. Notifications were the opposite: nothing persisted them anywhere, and
the one thing they need that an audit row must never have is mutable read
state.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-19 | Notifications got their own table instead of reusing `audit_logs` | An audit row records who acted; a notification records who must be told, and those are usually different people — a review decision writes one audit row and notifies every team member. An audit row is also immutable by design, and putting `read_at` on it would destroy the single property it exists to keep | One migration, `b2f4c9e1a730`, one table, one index; `audit_logs` unchanged | CRCE OS Team |
| 2026-08-19 | Only problems, teams, reviews and credits raise notifications | The bell's own empty state promises exactly those four. Adding a notification to every mutation is technically easy and is how a feed becomes noise nobody reads | Seven events: review decided, credits awarded, credits revised, mentor share, credits earned, join requested, join answered, suggestion submitted, suggestion decided. Publication, applications and drafts raise none | CRCE OS Team |
| 2026-08-19 | `notify()` joins the caller's transaction, exactly as `record_audit()` does | A notification for an action that rolled back is a lie, and moving the business write into the notifications module would make it a second owner of the thing it reports on | `db.add` only; the module that performed the action still commits. Modules import notifications; notifications imports no module, so the dependency graph stays acyclic without an event bus | CRCE OS Team |
| 2026-08-19 | Idempotency is a nullable `event_key` under `UNIQUE(user_id, event_key)` | Frontend retries must not spam a feed, and a distributed event system to prevent that would be far larger than the problem | Keys name the row that caused the event (`review:{submission_id}:{status}`, `credit.award:{award_id}`), so a genuine re-decision notifies again while a retry does not. Null keys stay distinct in Postgres, so a keyless event is never blocked | CRCE OS Team |
| 2026-08-19 | The notification row carries no `link` | A backend has no business knowing this app's URL shape | `entity` + `entity_id` travel instead; the API repository builds the route. Credit notifications reach both a team and their mentor, and no one page serves both, so they open nothing rather than sending half their readers to a 403 | CRCE OS Team |
| 2026-08-19 | Two audit endpoints, split by action prefix, not one endpoint with a filter | `/audit/activity` and `/audit/users` are two different permissions — staff can see what the institution built, only an admin can see who failed to sign in. `?kind=` would put an authorization boundary in a query parameter | `require_role(FACULTY, ADMIN, PRINCIPAL)` and `require_role(ADMIN)`; the split matches `login.`/`logout`/`token.` by prefix, so a new auth action files itself | CRCE OS Team |
| 2026-08-19 | Students read neither audit feed | Everything in the activity feed is already visible to a student through the module that owns it, as their own view of it. No student page asks for everyone's actions, and widening a gate to fill a panel is how a tenant boundary erodes | `test_audit.py` asserts 403 for a student on both routes | CRCE OS Team |
| 2026-08-19 | `metadata` does not leave the backend, and the activity feed names a kind of thing rather than a title | `common/audit.record_audit` records identifiers and outcomes only — deliberately, so the log can never leak a request body. There is no title in the table to render, and inventing one would be fabrication | The feed reads "Dr. Neha Kulkarni approved a stage in a project". Action codes are phrased in `features/audit/phrases.ts`, which is where every other bit of wording already lives | CRCE OS Team |
| 2026-08-19 | The admin identity panel shows no target column | An identity event is about the account that acted, and that account is already the actor | `UserAuditEntry.target` is empty; the row reads "Priya Nair signed in". A failed sign-in with no matching account reads "An unknown account failed to sign in" | CRCE OS Team |

---

## Analytics + Reports (2026-08-20)

Phase 13. The audit that opened the phase found the opposite of what the UI
suggested: most of the analytics console had no canonical source at all, and the
one section everyone assumed was missing a data model — the department
breakdown — turned out to be attributable from a required column that has
existed since the foundation. So the phase added three fields to an endpoint
that already existed, no table, no migration and no module.

| Date | Decision | Reason | Impact | Approved By |
|------|----------|--------|--------|-------------|
| 2026-08-20 | A project's department is its **problem's** department | `problems.department` is `NOT NULL` and indexed, it is what the catalog filters by, and the Credit Engine already stamps award transactions `context = "Dept. of {problem.department}"`. The platform was already using this rule; analytics only reads it | The breakdown needed no migration. `users.department` is nullable and is the person's own, so attributing by mentor or team lead would have been a second rule and would have forced a fabricated department for students who have none | CRCE OS Team |
| 2026-08-20 | No `/analytics` module and no new endpoint — three fields were added to `GET /dashboard/principal` | Both principal views already read one aggregate through one hook, behind one `require_role(PRINCIPAL)` gate. A second endpoint would have duplicated an authorization boundary to match the name of a page | Zero new routers, zero new gates, zero new tenancy surface. §26's speculative `/analytics/institution` is superseded | CRCE OS Team |
| 2026-08-20 | The six-month growth series is counted from real timestamps; **no snapshot or history table was created** | `credit_transactions` is append-only by construction (ADR-5) and `projects.created_at` is written once and never moved, so the history the chart needs is already stored. A snapshot table would have added a second source of truth for numbers that can be recomputed exactly | `credits.repository.monthly_points` and `dashboard.repository.monthly_projects`, both `GROUP BY date_trunc('month', ...)`. Alembic head unchanged at `b2f4c9e1a730` | CRCE OS Team |
| 2026-08-20 | Both month truncations run on `timezone('UTC', created_at)` | Both columns are `timestamptz`; left alone, `date_trunc` cuts the month at the session timezone, so the same ledger could report two different Julys depending on who asked | One deterministic series, and a test that backdates a row into an earlier month and requires it to appear there | CRCE OS Team |
| 2026-08-20 | The response carries counts; completion rate, success rate, the health dot and the critical-backlog flag are computed in the frontend repository | A threshold is an editorial line, not a fact. `admin.repository.ts` already turns headcounts into percentages and tones at exactly that layer | `HEALTHY_SUCCESS_RATE = 60` and `CRITICAL_BACKLOG = 10` live in `analytics.repository.ts`; changing either changes a colour and nothing else | CRCE OS Team |
| 2026-08-20 | Empty means empty: `growth` is `[]` when nothing happened in the window and `avg_review_days` is `null` until something is reviewed | Six flat zeros assert half a year the institution has not lived through, and a zero turnaround claims an instant verdict. A department that has published a problem but seen no project is a real row of zeros and stays in the table | The pages hide the growth section and the highlight rather than drawing them empty | CRCE OS Team |
| 2026-08-20 | The department radar and its performance meters stay empty, and the card is now hidden rather than merely unreachable | Four of the five drawn axes (industry relevance, research output, patents, collaboration) measure nothing the platform records. `RadarChart` divides by `axes.length`, so an empty array would have rendered `NaN` coordinates once the growth section unhid the row | `PrincipalDashboard.tsx` gates the radar card on `departmentRadar.length`, and the growth card spans 12 columns without it | CRCE OS Team |
| 2026-08-20 | Reports export the live department table as CSV; no report-generation engine was built | The report categories were labels. A canonical current-state table can be exported honestly today; a PDF pipeline and historical reports are infrastructure this phase did not need | The drawer is now reachable because `departments` is populated; the format choice remains dropped until an export endpoint exists | CRCE OS Team |
| 2026-08-20 | `campusImpact`, the admin platform snapshot and the institutions console were left untouched | All three are cross-tenant or pre-auth reads. Phase 14 introduces multi-institution; widening a query here would have done it early and badly | Still mock-backed, exactly as Phase 10 left them | CRCE OS Team |

---

## Change Management Rules

When making future architectural changes:

1. Document the proposed change.
2. Explain the reason.
3. Assess the impact on existing modules.
4. Update Architecture, TRD, and related documentation if necessary.
5. Record the decision in this log before implementation.

The Decision Log is the historical memory of the project and should be maintained throughout the lifecycle of CRCE OS.

