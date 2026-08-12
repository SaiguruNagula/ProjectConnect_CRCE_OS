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

## Change Management Rules

When making future architectural changes:

1. Document the proposed change.
2. Explain the reason.
3. Assess the impact on existing modules.
4. Update Architecture, TRD, and related documentation if necessary.
5. Record the decision in this log before implementation.

The Decision Log is the historical memory of the project and should be maintained throughout the lifecycle of CRCE OS.

