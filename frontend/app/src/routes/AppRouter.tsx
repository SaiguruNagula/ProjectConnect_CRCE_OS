/**
 * Application router.
 *
 * Groups routes by access rather than by chrome: the public site, the shared
 * pages every signed-in role reads, the two shared pages that belong to one
 * role, and the four role workspaces. SiteLayout supplies the chrome for the
 * first three and follows the session; ProtectedRoute supplies the guard.
 * Child paths are relative to their layout parent; canonical absolute paths live
 * in ROUTES (constants/routes.ts). Every route renders a real page.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { SiteLayout } from '@/layouts/SiteLayout'
import { StudentLayout } from '@/layouts/StudentLayout'
import { FacultyLayout } from '@/layouts/FacultyLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PrincipalLayout } from '@/layouts/PrincipalLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { NotFound } from '@/pages/NotFound'
import { LandingPage } from '@/pages/public/LandingPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { InnovationHubPage } from '@/pages/shared/InnovationHubPage'
import { OpenProblemsPage } from '@/pages/shared/OpenProblemsPage'
import { ProblemDetailsPage } from '@/pages/shared/ProblemDetailsPage'
import { TeamFormationPage } from '@/pages/shared/TeamFormationPage'
import { SolutionsHubPage } from '@/pages/shared/SolutionsHubPage'
import { LeaderboardPage } from '@/pages/shared/LeaderboardPage'
import { PortfolioPage } from '@/pages/shared/PortfolioPage'
import { ProjectSubmissionsPage } from '@/pages/shared/ProjectSubmissionsPage'
import { ReviewEnginePage } from '@/pages/shared/ReviewEnginePage'
import { ProfilePage } from '@/pages/shared/ProfilePage'
import { StudentDashboard } from '@/pages/student/StudentDashboard'
import { MyProjectsPage } from '@/pages/student/MyProjectsPage'
import { CreditsPage } from '@/pages/student/CreditsPage'
import { FacultyDashboard } from '@/pages/faculty/FacultyDashboard'
import { CreateProblemPage } from '@/pages/faculty/CreateProblemPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminInstitutionsPage } from '@/pages/admin/AdminInstitutionsPage'
import { PrincipalDashboard } from '@/pages/principal/PrincipalDashboard'
import { PrincipalAnalyticsPage } from '@/pages/principal/PrincipalAnalyticsPage'

export function AppRouter() {
  return (
    <Routes>
      {/* The public site: the only pages that ask the backend for nothing. */}
      <Route element={<SiteLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* Shared pages. Every one of them reads an endpoint that requires a
          token, so they are signed-in pages that four workspaces share — not
          public ones. Anonymous visitors are sent to log in rather than to an
          "Authentication required." error. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<SiteLayout />}>
          <Route path="innovation-hub" element={<InnovationHubPage />} />
          <Route path="open-problems" element={<OpenProblemsPage />} />
          <Route path="problem/:id" element={<ProblemDetailsPage />} />
          <Route path="solutions" element={<SolutionsHubPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="portfolio/:id" element={<PortfolioPage />} />
          {/* Credit Engine is documented as /credits (MIGRATION_MAP) but the ledger
              is per-student, so it lives in the student workspace. Keep the
              documented path working rather than duplicating the page. */}
          <Route path="credits" element={<Navigate to={ROUTES.STUDENT.CREDITS} replace />} />
        </Route>
      </Route>

      {/* Team Formation is the student half of applying — every action on it
          POSTs as a student — so the documented path is student-only. */}
      <Route element={<ProtectedRoute allow="student" />}>
        <Route element={<SiteLayout />}>
          <Route path="team" element={<TeamFormationPage />} />
        </Route>
      </Route>

      {/* Likewise the documented Review Engine path: the queues it loads are
          the mentor's own, and the backend gives anyone else a 403. */}
      <Route element={<ProtectedRoute allow="faculty" />}>
        <Route element={<SiteLayout />}>
          <Route path="review" element={<ReviewEnginePage />} />
        </Route>
      </Route>

      {/* Student workspace */}
      <Route element={<ProtectedRoute allow="student" />}>
        <Route path="student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="projects" element={<MyProjectsPage />} />
          <Route path="projects/:id" element={<ProjectSubmissionsPage />} />
          <Route path="credits" element={<CreditsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Faculty workspace */}
      <Route element={<ProtectedRoute allow="faculty" />}>
        <Route path="faculty" element={<FacultyLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboard />} />
          <Route path="create-problem" element={<CreateProblemPage />} />
          <Route path="review" element={<ReviewEnginePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin workspace */}
      <Route element={<ProtectedRoute allow="admin" />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="institutions" element={<AdminInstitutionsPage />} />
        </Route>
      </Route>

      {/* Principal workspace */}
      <Route element={<ProtectedRoute allow="principal" />}>
        <Route path="principal" element={<PrincipalLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PrincipalDashboard />} />
          <Route path="analytics" element={<PrincipalAnalyticsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
