/**
 * Mock repository implementations.
 *
 * Each method reads centralized mock data and returns it through `resolve()`
 * (simulated latency) so the app exercises real async states. The 1:1 API
 * endpoint each will call is noted per method — to go live, create an
 * api/ sibling implementing the same interfaces and switch repositories/index.
 */
import { resolve, reject } from '@/services/mock'
import type {
  AdminRepository,
  CreditRepository,
  DashboardRepository,
  LeaderboardRepository,
  PortfolioRepository,
  ProblemRepository,
  ProjectRepository,
  ReviewRepository,
  SolutionRepository,
  Repositories,
} from '@/repositories/types'
import type { Role } from '@/types'
import { MOCK_PROBLEMS } from '@/mocks/problems'
import { MOCK_PROJECTS, PENDING_INVITATIONS, MOCK_TEAMS } from '@/mocks/projects'
import { MOCK_STUDENT_LEADERBOARD, MOCK_FACULTY_LEADERBOARD } from '@/mocks/leaderboard'
import { MOCK_PORTFOLIO } from '@/mocks/portfolio'
import {
  MOCK_CREDIT_TRANSACTIONS,
  CREDIT_BREAKDOWN,
  CREDIT_RULES,
  CREDIT_SUMMARY,
  CREDIT_CATEGORIES,
  CREDIT_PIPELINE,
} from '@/mocks/credits'
import { MOCK_REVIEWS, REVIEW_RUBRIC, REVIEW_STATS } from '@/mocks/reviews'
import { MOCK_SOLUTIONS, SOLUTION_STATS } from '@/mocks/solutions'
import { MOCK_DIRECTORY_USERS, MOCK_INSTITUTIONS } from '@/mocks/directory'
import { MOCK_ACTIVITY, MOCK_DEADLINES, MOCK_NOTIFICATIONS } from '@/mocks/notifications'
import { DASHBOARD_STATS, CREDIT_TREND, DEPARTMENT_DISTRIBUTION } from '@/mocks/analytics'

const problems: ProblemRepository = {
  list: () => resolve(MOCK_PROBLEMS), // GET /api/v1/problems
  get: (id) => resolve(MOCK_PROBLEMS.find((p) => p.id === id) ?? null), // GET /api/v1/problems/{id}
}

const projects: ProjectRepository = {
  list: () => resolve(MOCK_PROJECTS), // GET /api/v1/projects
  get: (id) => resolve(MOCK_PROJECTS.find((p) => p.id === id) ?? null), // GET /api/v1/projects/{id}
  invitations: () => resolve(PENDING_INVITATIONS), // GET /api/v1/teams/invitations
  teams: () => resolve(MOCK_TEAMS), // GET /api/v1/teams
}

const leaderboard: LeaderboardRepository = {
  students: () => resolve(MOCK_STUDENT_LEADERBOARD), // GET /api/v1/leaderboard/students
  faculty: () => resolve(MOCK_FACULTY_LEADERBOARD), // GET /api/v1/leaderboard/faculty
}

const portfolio: PortfolioRepository = {
  get: (_userId) => resolve(MOCK_PORTFOLIO), // GET /api/v1/portfolio/{userId}
}

const credits: CreditRepository = {
  history: () => resolve(MOCK_CREDIT_TRANSACTIONS), // GET /api/v1/credits/history
  breakdown: () => resolve(CREDIT_BREAKDOWN), // GET /api/v1/credits/me
  rules: () => resolve(CREDIT_RULES), // GET /api/v1/credits/rules
  summary: () => resolve(CREDIT_SUMMARY), // GET /api/v1/credits/summary
  categories: () => resolve(CREDIT_CATEGORIES), // GET /api/v1/credits/categories
  pipeline: () => resolve(CREDIT_PIPELINE), // GET /api/v1/credits/pipeline
}

const reviews: ReviewRepository = {
  list: () => resolve(MOCK_REVIEWS), // GET /api/v1/reviews
  rubric: () => resolve(REVIEW_RUBRIC), // GET /api/v1/reviews/{id}/rubric
  stats: () => resolve(REVIEW_STATS), // GET /api/v1/reviews/stats
  submitDecision: (input) => {
    // POST /api/v1/reviews/{id}/decision — mock returns the updated submission.
    const found = MOCK_REVIEWS.find((r) => r.id === input.submissionId)
    if (!found) return reject('Submission not found')
    return resolve({
      ...found,
      status: input.decision,
      creditsAwarded: input.decision === 'approved' ? input.creditsAwarded : found.creditsAwarded,
    })
  },
}

const solutions: SolutionRepository = {
  list: () => resolve(MOCK_SOLUTIONS), // GET /api/v1/solutions
  stats: () => resolve(SOLUTION_STATS), // GET /api/v1/solutions/stats
}

const admin: AdminRepository = {
  users: () => resolve(MOCK_DIRECTORY_USERS), // GET /api/v1/admin/users
  institutions: () => resolve(MOCK_INSTITUTIONS), // GET /api/v1/admin/institutions
}

const dashboard: DashboardRepository = {
  stats: (role: Role) => resolve(DASHBOARD_STATS[role]),
  activity: () => resolve(MOCK_ACTIVITY),
  deadlines: () => resolve(MOCK_DEADLINES),
  notifications: () => resolve(MOCK_NOTIFICATIONS), // GET /api/v1/notifications
  creditTrend: () => resolve(CREDIT_TREND),
  departmentDistribution: () => resolve(DEPARTMENT_DISTRIBUTION), // GET /api/v1/analytics/departments
}

export const mockRepositories: Repositories = {
  problems,
  projects,
  leaderboard,
  portfolio,
  credits,
  reviews,
  solutions,
  admin,
  dashboard,
}
