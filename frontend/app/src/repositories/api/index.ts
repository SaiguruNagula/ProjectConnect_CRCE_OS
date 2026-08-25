/**
 * Live repository implementations — the API side of the swap point.
 *
 * A partial map on purpose: it holds the repositories whose backend exists, and
 * repositories/index.ts lays it over the mocks. Each later phase adds its
 * repository here and removes nothing, so the app is never half-migrated in a
 * way a page can see.
 *
 * Still on the mocks, waiting on its own phase: `facultyProfile`. `admin` and
 * `analytics` are here but only half live — the institution console waits on
 * Phase 14, campus impact on Phase 13.
 */
import type { Repositories } from '@/repositories/types'
import { adminApiRepository } from '@/repositories/api/admin.repository'
import { analyticsApiRepository } from '@/repositories/api/analytics.repository'
import { creditsApiRepository } from '@/repositories/api/credits.repository'
import { dashboardApiRepository } from '@/repositories/api/dashboard.repository'
import { leaderboardApiRepository } from '@/repositories/api/leaderboard.repository'
import { notificationsApiRepository } from '@/repositories/api/notifications.repository'
import { portfolioApiRepository } from '@/repositories/api/portfolio.repository'
import { problemsApiRepository } from '@/repositories/api/problems.repository'
import { profileApiRepository } from '@/repositories/api/profile.repository'
import { projectsApiRepository } from '@/repositories/api/projects.repository'
import { reviewsApiRepository } from '@/repositories/api/reviews.repository'
import { solutionsApiRepository } from '@/repositories/api/solutions.repository'

export const apiRepositories: Partial<Repositories> = {
  admin: adminApiRepository,
  analytics: analyticsApiRepository,
  credits: creditsApiRepository,
  dashboard: dashboardApiRepository,
  leaderboard: leaderboardApiRepository,
  notifications: notificationsApiRepository,
  portfolio: portfolioApiRepository,
  problems: problemsApiRepository,
  profile: profileApiRepository,
  projects: projectsApiRepository,
  reviews: reviewsApiRepository,
  solutions: solutionsApiRepository,
}
