/**
 * Read services for catalog + workspace data. Each method maps 1:1 to a future
 * API endpoint (noted in comments) and returns the same shape the API will.
 */
import { resolve } from '@/services/mock'
import { MOCK_PROBLEMS } from '@/mocks/problems'
import { MOCK_PROJECTS, PENDING_INVITATIONS } from '@/mocks/projects'
import { MOCK_STUDENT_LEADERBOARD, MOCK_FACULTY_LEADERBOARD } from '@/mocks/leaderboard'
import { MOCK_PORTFOLIO } from '@/mocks/portfolio'
import { MOCK_CREDIT_TRANSACTIONS, CREDIT_BREAKDOWN } from '@/mocks/credits'
import { MOCK_ACTIVITY, MOCK_DEADLINES, MOCK_NOTIFICATIONS } from '@/mocks/notifications'
import { DASHBOARD_STATS, CREDIT_TREND, DEPARTMENT_DISTRIBUTION } from '@/mocks/analytics'
import type { Role } from '@/types'

export const problemsService = {
  // GET /api/v1/problems
  list: () => resolve(MOCK_PROBLEMS),
  // GET /api/v1/problems/{id}
  get: (id: string) => resolve(MOCK_PROBLEMS.find((p) => p.id === id) ?? null),
}

export const projectsService = {
  // GET /api/v1/projects (mine)
  list: () => resolve(MOCK_PROJECTS),
  get: (id: string) => resolve(MOCK_PROJECTS.find((p) => p.id === id) ?? null),
  // GET /api/v1/teams/invitations
  invitations: () => resolve(PENDING_INVITATIONS),
}

export const leaderboardService = {
  // GET /api/v1/leaderboard/{students|faculty}
  students: () => resolve(MOCK_STUDENT_LEADERBOARD),
  faculty: () => resolve(MOCK_FACULTY_LEADERBOARD),
}

export const portfolioService = {
  // GET /api/v1/portfolio/{userId}
  get: (_userId: string) => resolve(MOCK_PORTFOLIO),
}

export const creditsService = {
  // GET /api/v1/credits/history
  history: () => resolve(MOCK_CREDIT_TRANSACTIONS),
  breakdown: () => resolve(CREDIT_BREAKDOWN),
}

export const dashboardService = {
  stats: (role: Role) => resolve(DASHBOARD_STATS[role]),
  activity: () => resolve(MOCK_ACTIVITY),
  deadlines: () => resolve(MOCK_DEADLINES),
  notifications: () => resolve(MOCK_NOTIFICATIONS),
  creditTrend: () => resolve(CREDIT_TREND),
  departmentDistribution: () => resolve(DEPARTMENT_DISTRIBUTION),
}
