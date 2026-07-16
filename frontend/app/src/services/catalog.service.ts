/**
 * Application services — business/orchestration layer.
 *
 * Services depend only on the repository contracts (repositories/index), never
 * on mock data or transport details. Pages/hooks call services; services call
 * repositories. This keeps the swap seam at the repository layer.
 */
import { repositories } from '@/repositories'
import type { Role } from '@/types'
import type { ReviewDecisionInput } from '@/types/domain'

export const problemsService = {
  list: () => repositories.problems.list(),
  get: (id: string) => repositories.problems.get(id),
}

export const projectsService = {
  list: () => repositories.projects.list(),
  get: (id: string) => repositories.projects.get(id),
  invitations: () => repositories.projects.invitations(),
  teams: () => repositories.projects.teams(),
}

export const leaderboardService = {
  students: () => repositories.leaderboard.students(),
  faculty: () => repositories.leaderboard.faculty(),
}

export const portfolioService = {
  get: (userId: string) => repositories.portfolio.get(userId),
}

export const creditsService = {
  history: () => repositories.credits.history(),
  breakdown: () => repositories.credits.breakdown(),
  rules: () => repositories.credits.rules(),
  summary: () => repositories.credits.summary(),
  categories: () => repositories.credits.categories(),
  pipeline: () => repositories.credits.pipeline(),
}

export const reviewsService = {
  list: () => repositories.reviews.list(),
  rubric: () => repositories.reviews.rubric(),
  stats: () => repositories.reviews.stats(),
  submitDecision: (input: ReviewDecisionInput) => repositories.reviews.submitDecision(input),
}

export const solutionsService = {
  list: () => repositories.solutions.list(),
  stats: () => repositories.solutions.stats(),
}

export const adminService = {
  users: () => repositories.admin.users(),
  institutions: () => repositories.admin.institutions(),
}

export const dashboardService = {
  stats: (role: Role) => repositories.dashboard.stats(role),
  activity: () => repositories.dashboard.activity(),
  deadlines: () => repositories.dashboard.deadlines(),
  notifications: () => repositories.dashboard.notifications(),
  creditTrend: () => repositories.dashboard.creditTrend(),
  departmentDistribution: () => repositories.dashboard.departmentDistribution(),
}
