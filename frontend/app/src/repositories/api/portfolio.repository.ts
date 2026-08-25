/**
 * Portfolio repository — live (Phase 7), read-only by construction.
 *
 * The portfolio owns nothing. It presents what other modules verified: identity
 * and department from the account, credits from the Credit Engine, projects and
 * the counts of published work from their own modules, and the rank the
 * leaderboard already computed. There is no write verb here and no edit path
 * through it — a student changes what this shows by editing their profile or by
 * doing the work.
 *
 * Sections the backend cannot verify (research, hackathons, certificates,
 * external achievements, hall-of-fame badges, verified skills) come back empty
 * rather than seeded: the page's section toggles already handle absence, and an
 * invented credential is the one thing a verified portfolio may never contain.
 */
import { apiClient } from '@/api/client'
import { camelize } from '@/api/case'
import { mockRepositories } from '@/repositories/mock'
import type { PortfolioRepository } from '@/repositories/types'
import type { Role } from '@/types'
import type { LeaderboardEntry, Portfolio, Project } from '@/types/domain'

/** GET /portfolio/me. */
interface PortfolioBody {
  userId: string
  name: string
  role: Role
  email: string
  avatarInitials: string
  department: string | null
  totalCredits: number
  stats: { projectsCompleted: number; verifiedSolutions: number }
  projects: Project[]
}

async function compose(): Promise<Portfolio> {
  const body = camelize<PortfolioBody>((await apiClient.get<unknown>('/portfolio/me')).data)
  // The board this person is actually ranked on — students and faculty earn
  // from the same engine but are listed separately.
  const path = body.role === 'faculty' ? 'faculty' : 'students'
  const { data } = await apiClient.get<unknown>(`/leaderboard/${path}`)
  const rank = camelize<LeaderboardEntry[]>(data).find((e) => e.id === body.userId)?.rank

  return {
    userId: body.userId,
    name: body.name,
    avatarInitials: body.avatarInitials,
    department: body.department ?? '',
    institutionalEmail: body.email,
    totalCredits: body.totalCredits,
    // 0 = not on the board yet, which is what a student with no credits is.
    globalRank: rank ?? 0,
    projectsBuilt: body.stats.projectsCompleted,
    verifiedSolutionsCount: body.stats.verifiedSolutions,
    projects: body.projects,
    // Profile prose is not part of the portfolio contract yet, so the page
    // falls back to its own placeholders instead of showing someone else's.
    headline: '',
    tagline: '',
    bio: '',
    facultyValidationCount: 0,
    hallOfFame: [],
    skills: [],
    solutions: [],
    research: [],
    hackathons: [],
    certificates: [],
    achievements: [],
    timeline: [],
  }
}

export const portfolioApiRepository: PortfolioRepository = {
  get: async (userId: string) => {
    const portfolio = await compose()
    if (userId !== 'me' && userId !== portfolio.userId) {
      // `GET /portfolio/{userId}` is deliberately unimplemented: a visitor's
      // view is gated on visibility flags that do not exist yet, so the page
      // shows its error state rather than a portfolio nobody consented to.
      throw new Error('Public portfolios are not available yet.')
    }
    return portfolio
  },
  // No backend owner: the curation layer edits sections (research, hackathons,
  // credentials) that have no canonical source, behind a `published` flag for a
  // public portfolio route that does not exist. It stays in-session.
  getCustomization: () => mockRepositories.portfolio.getCustomization(),
  updateCustomization: (patch) => mockRepositories.portfolio.updateCustomization(patch),
}
