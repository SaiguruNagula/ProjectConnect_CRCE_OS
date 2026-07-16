# CRCE OS — Frontend Migration Map

> Purpose:
>
> This document maps every approved Stitch prototype to its corresponding React feature/module.
> During migration, Claude Code must use the Stitch HTML (`code.html`) as the visual source of truth while preserving the production React architecture.
>
> **Rule:** Never redesign the UI. Convert the approved Stitch design into reusable React components.

---

# Migration Status Legend

- ⬜ Not Started
- 🟨 In Progress
- ✅ Completed
- 🔄 Needs UI Refinement

---

# Public Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Landing | Landing | `/` | `crce_os_aurora_immersive_landing_1` | ✅ |
| Login | Authentication | `/login` | `crce_os_authentication_gateway_connected` | ✅ |
| About | About | `/about` | `crce_os_about_refined_flow` | ✅ |

---

# Shared Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Innovation Hub | InnovationHub | `/innovation-hub` | `campus_os_core_1` | ✅ |
| Open Problems | OpenProblems | `/open-problems` | `campus_os_core_2` | ✅ |
| Problem Details | ProblemDetails | `/problem/:id` | `crce_os_faculty_problem_architect_production_master_edition` | ✅ |
| Team Formation | TeamFormation | `/team` | `crce_os_team_formation_dual_application_flow_1` | ✅ |
| Project Workspace | ProjectWorkspace | `/project` | `crce_os_project_command_center_smart_attendance` | ✅ |
| Review Engine | ReviewEngine | `/review` | `crce_os_faculty_review_dashboard` + `crce_os_review_engine_refined_layout_logic` | ✅ |
| Credit Engine | CreditEngine | `/credits` | `crce_os_credit_engine_milestone_tracker` | ✅ |
| Solutions Hub | SolutionsHub | `/solutions` | `crce_os_campus_solutions_unified_app_marketplace` | ✅ |
| Leaderboard | Leaderboard | `/leaderboard` | `crce_os_leaderboard_refined_layout` | 🔄 |
| Portfolio | Portfolio | `/portfolio` | `crce_os_premium_portfolio_integration` *(confirm folder)* | 🔄 |

---

# Student Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Dashboard | StudentDashboard | `/student/dashboard` | `crce_os_student_dashboard_central_command_center` | 🔄 |
| My Projects | StudentProjects | `/student/projects` | `crce_os_my_projects_hub` | 🔄 |
| Profile | StudentProfile | `/student/profile` | `crce_os_student_profile_identity_management_hub` | 🔄 |

---

# Faculty Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Dashboard | FacultyDashboard | `/faculty/dashboard` | `crce_os_faculty_innovation_dashboard` | 🔄 |
| Create Problem | FacultyCreateProblem | `/faculty/problems/create` | `crce_os_faculty_create_problem_module` | 🔄 |
| Profile | FacultyProfile | `/faculty/profile` | `crce_os_faculty_profile_production_master_edition` | 🔄 |

---

# Admin Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Dashboard | AdminDashboard | `/admin/dashboard` | `projectconnect_admin_dashboard_platform_master_control` | 🔄 |
| Users | UserManagement | `/admin/users` | `projectconnect_admin_user_management_master_console` | 🔄 |
| Institutions | InstitutionManagement | `/admin/institutions` | `projectconnect_admin_institution_management_console` | 🔄 |

---

# Principal Modules

| Module | React Feature | Route | Stitch Folder | Status |
|---------|---------------|-------|---------------|--------|
| Dashboard | PrincipalDashboard | `/principal/dashboard` | `crce_os_principal_executive_command_center_production_refined` | 🔄 |
| Institution Analytics | InstitutionAnalytics | `/principal/analytics` | `crce_os_institution_analytics_production_master_console` | 🔄 |

---

# Migration Rules

For every page migration:

1. Use the corresponding `code.html` as the visual source of truth.
2. Preserve the existing React architecture.
3. Do not redesign the UI.
4. Do not modify routing.
5. Do not modify layouts.
6. Do not modify services unless required.
7. Do not duplicate components.
8. Extract reusable UI into shared components.
9. Keep responsiveness identical to the Stitch prototype.
10. Maintain accessibility standards.

---

# Production Architecture

Every migrated page must follow:

```
Page
    ↓
Feature
    ↓
Reusable Components
    ↓
Hooks
    ↓
Services
    ↓
Repositories
    ↓
Mock Repository (Today)
    ↓
API Repository (Future)
    ↓
FastAPI
    ↓
PostgreSQL
```

Pages must never directly consume mock data.

---

# Definition of Done

A page is considered migrated only if:

- ✅ Pixel-accurate to the approved Stitch design
- ✅ Responsive
- ✅ Uses shared layouts
- ✅ Uses reusable components
- ✅ Uses services and repositories
- ✅ No hardcoded business logic
- ✅ Build passes
- ✅ Typecheck passes
- ✅ Lint passes
- ✅ Route connected
- ✅ Status updated to **Completed**

---

# Overall Progress

Status key: ✅ pixel-migrated · 🔄 functional but not yet pixel-faithful to Stitch · ⬜ not started

| Layer | ✅ Completed | 🔄 Needs UI Refinement | Total |
|--------|----------:|----------:|------:|
| Public | 3 | 0 | 3 |
| Shared | 8 | 2 | 10 |
| Student | 0 | 3 | 3 |
| Faculty | 0 | 3 | 3 |
| Admin | 0 | 3 | 3 |
| Principal | 0 | 2 | 2 |

**Total Progress:** 11 / 24 pixel-migrated · 13 functional pending UI refinement