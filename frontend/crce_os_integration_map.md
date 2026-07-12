# CRCE OS Production Architecture & Integration Map

## 1. Routing & Page Map
| Route | Screen Placeholder | Role Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/` | `{{DATA:SCREEN:SCREEN_119}}` | Public | Landing Page |
| `/login` | `{{DATA:SCREEN:SCREEN_57}}` | Public | Auth Gateway |
| `/student/dashboard` | `{{DATA:SCREEN:SCREEN_67}}` | Student | Central Command |
| `/student/projects` | `{{DATA:SCREEN:SCREEN_37}}` | Student | My Projects Hub |
| `/student/projects/:id` | `{{DATA:SCREEN:SCREEN_117}}` | Student | Project Workspace |
| `/student/profile` | `{{DATA:SCREEN:SCREEN_124}}` | Student | Identity Hub |
| `/faculty/dashboard` | `{{DATA:SCREEN:SCREEN_78}}` | Faculty | Innovation Overview |
| `/faculty/create-problem` | `{{DATA:SCREEN:SCREEN_86}}` | Faculty | Problem Architect |
| `/faculty/review` | `{{DATA:SCREEN:SCREEN_100}}` | Faculty | Review Dashboard |
| `/faculty/profile` | `{{DATA:SCREEN:SCREEN_74}}` | Faculty | Institutional Identity |
| `/admin/dashboard` | `{{DATA:SCREEN:SCREEN_95}}` | Admin | Platform Mission Control |
| `/admin/users` | `{{DATA:SCREEN:SCREEN_97}}` | Admin | User Governance |
| `/admin/institutions` | `{{DATA:SCREEN:SCREEN_45}}` | Admin | Institution Management |
| `/executive/dashboard` | `{{DATA:SCREEN:SCREEN_99}}` | Principal | Executive Summary |
| `/executive/analytics` | `{{DATA:SCREEN:SCREEN_46}}` | Principal | Governance Console |
| `/innovation-hub` | `{{DATA:SCREEN:SCREEN_70}}` | Shared | Digital Front Door |
| `/problems` | `{{DATA:SCREEN:SCREEN_93}}` | Shared | Open Problems Catalog |
| `/problems/:id` | `{{DATA:SCREEN:SCREEN_125}}` | Shared | Problem Specification |
| `/team-formation` | `{{DATA:SCREEN:SCREEN_111}}` | Shared | MVP Team Lifecycle |
| `/solutions` | `{{DATA:SCREEN:SCREEN_11}}` | Shared | Unified Innovation Store |
| `/leaderboard` | `{{DATA:SCREEN:SCREEN_31}}` | Shared | Dynamic Impact Board |
| `/portfolio/:id` | `{{DATA:SCREEN:SCREEN_53}}` | Shared | Verified Professional Record |

## 2. Navigation Flow & Triggers
- **Logo Click**: Redirects to `Role-Based Dashboard` (or `/` if unauthenticated).
- **Primary CTA (Landing)**: `Explore Problems` → `/problems`.
- **Primary CTA (Problems)**: `Apply Now` → `/team-formation`.
- **Workspace Entry**: `Open Workspace` (from My Projects) → `/student/projects/:id`.
- **Review Submission**: `Submit Review` (from Workspace) → `POST /api/v1/reviews`.
- **Credit Award**: `Approve Review` (Faculty) → `PATCH /api/v1/credits`.

## 3. Component Reuse & API Strategy
- **Navigation**: Shared `TopAppBar` and `BottomNavBar` with role-aware rendering logic.
- **State Management**: React Context/Zustand stubs for `user`, `activeProject`, and `notifications`.
- **Data Fetching**: All lists (Leaderboard, Projects, Problems) wired to `fetch()` hooks targeting `/api/v1/*` endpoints with loading/error skeletons.
- **RBAC**: Middleware-based route protection ensuring Faculty cannot access Principal dashboards and Students are restricted to their own project instances.