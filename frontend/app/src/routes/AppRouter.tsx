/**
 * Application router.
 *
 * Groups routes by layout (Public/Shared → role workspaces) per ARCHITECTURE.md.
 * Every route currently renders <Placeholder> pointing at its approved Stitch
 * prototype; migration swaps a real page in per route (STEP 9) with no other
 * change. Child paths are relative to their layout parent; canonical absolute
 * paths live in ROUTES (constants/routes.ts).
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { StudentLayout } from '@/layouts/StudentLayout'
import { FacultyLayout } from '@/layouts/FacultyLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PrincipalLayout } from '@/layouts/PrincipalLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { Placeholder } from '@/pages/Placeholder'
import { NotFound } from '@/pages/NotFound'
import { LoginPage } from '@/pages/public/LoginPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { InnovationHubPage } from '@/pages/shared/InnovationHubPage'
import { OpenProblemsPage } from '@/pages/shared/OpenProblemsPage'
import { ProblemDetailsPage } from '@/pages/shared/ProblemDetailsPage'
import { TeamFormationPage } from '@/pages/shared/TeamFormationPage'
import { SolutionsHubPage } from '@/pages/shared/SolutionsHubPage'
import { LeaderboardPage } from '@/pages/shared/LeaderboardPage'
import { PortfolioPage } from '@/pages/shared/PortfolioPage'
import { StudentDashboard } from '@/pages/student/StudentDashboard'

export function AppRouter() {
  return (
    <Routes>
      {/* Public + Shared modules */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<Placeholder title="About" stitchSource="crce_os_expanded_about_experience" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="innovation-hub" element={<InnovationHubPage />} />
        <Route path="open-problems" element={<OpenProblemsPage />} />
        <Route path="problem/:id" element={<ProblemDetailsPage />} />
        <Route path="team" element={<TeamFormationPage />} />
        <Route path="project" element={<Placeholder title="Project Space" stitchSource="crce_os_project_space_smart_attendance" />} />
        <Route path="review" element={<Placeholder title="Review Engine" stitchSource="crce_os_review_engine_milestone_hub" />} />
        <Route path="solutions" element={<SolutionsHubPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="portfolio/:id" element={<PortfolioPage />} />
      </Route>

      {/* Student workspace */}
      <Route element={<ProtectedRoute allow="student" />}>
        <Route path="student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="projects" element={<Placeholder title="My Projects" stitchSource="crce_os_my_projects_production_refinement" />} />
          <Route path="projects/:id" element={<Placeholder title="Project Workspace" stitchSource="crce_os_project_command_center_smart_attendance" />} />
          <Route path="credits" element={<Placeholder title="Credits" stitchSource="crce_os_credit_engine_milestone_tracker" />} />
          <Route path="profile" element={<Placeholder title="Profile" stitchSource="crce_os_student_profile_identity_management_hub" />} />
        </Route>
      </Route>

      {/* Faculty workspace */}
      <Route element={<ProtectedRoute allow="faculty" />}>
        <Route path="faculty" element={<FacultyLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Placeholder title="Faculty Dashboard" stitchSource="crce_os_faculty_innovation_dashboard" />} />
          <Route path="create-problem" element={<Placeholder title="Create Problem" stitchSource="crce_os_faculty_problem_architect_production_master_edition" />} />
          <Route path="review" element={<Placeholder title="Reviews" stitchSource="crce_os_faculty_review_dashboard" />} />
          <Route path="profile" element={<Placeholder title="Faculty Profile" stitchSource="crce_os_faculty_profile_production_master_edition" />} />
        </Route>
      </Route>

      {/* Admin workspace */}
      <Route element={<ProtectedRoute allow="admin" />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Placeholder title="Admin Dashboard" stitchSource="crce_os_executive_dashboard_master_governance_console" />} />
          <Route path="users" element={<Placeholder title="User Governance" stitchSource="admin — user governance (SCREEN_97)" />} />
          <Route path="institutions" element={<Placeholder title="Institution Management" stitchSource="admin — institutions (SCREEN_45)" />} />
        </Route>
      </Route>

      {/* Principal workspace */}
      <Route element={<ProtectedRoute allow="principal" />}>
        <Route path="principal" element={<PrincipalLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Placeholder title="Executive Dashboard" stitchSource="crce_os_principal_executive_command_center_production_refined" />} />
          <Route path="analytics" element={<Placeholder title="Institution Analytics" stitchSource="crce_os_institution_analytics_production_master_console" />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
