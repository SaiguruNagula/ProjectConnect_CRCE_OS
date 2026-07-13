/**
 * Application services — business/orchestration layer.
 *
 * Services depend only on the repository contracts (repositories/index), never
 * on mock data or transport details. Pages/hooks call services; services call
 * repositories. This keeps the swap seam at the repository layer.
 */
import { repositories } from '@/repositories'
import type { Role } from '@/types'

export const problemsService = {
  list: () => repositories.problems.list(),
  get: (id: string) => repositories.problems.get(id),
}

export const projectsService = {
  list: () => repositories.projects.list(),
  get: (id: string) => repositories.projects.get(id),
  invitations: () => repositories.projects.invitations(),
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
}

export const reviewsService = {
  list: () => repositories.reviews.list(),
  rubric: () => repositories.reviews.rubric(),
}

export const dashboardService = {
  stats: (role: Role) => repositories.dashboard.stats(role),
  activity: () => repositories.dashboard.activity(),
  deadlines: () => repositories.dashboard.deadlines(),
  notifications: () => repositories.dashboard.notifications(),
  creditTrend: () => repositories.dashboard.creditTrend(),
  departmentDistribution: () => repositories.dashboard.departmentDistribution(),
}
