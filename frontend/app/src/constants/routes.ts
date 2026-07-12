/**
 * Centralized route constants — the single source of truth for paths.
 * Never hardcode route strings in components; import from here.
 *
 * Structure mirrors the architecture layers (Public → Shared → Role) from
 * ARCHITECTURE.md and the canonical route map in
 * frontend/crce_os_integration_map.md.
 */

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    ABOUT: '/about',
    LOGIN: '/login',
  },
  /** Shared modules — publicly browsable, reused across every role. */
  SHARED: {
    INNOVATION_HUB: '/innovation-hub',
    OPEN_PROBLEMS: '/open-problems',
    PROBLEM_DETAILS: '/problem/:id',
    TEAM_FORMATION: '/team',
    PROJECT_SPACE: '/project',
    REVIEW_ENGINE: '/review',
    SOLUTIONS: '/solutions',
    LEADERBOARD: '/leaderboard',
    PORTFOLIO: '/portfolio/:id',
  },
  STUDENT: {
    ROOT: '/student',
    DASHBOARD: '/student/dashboard',
    PROJECTS: '/student/projects',
    PROJECT_DETAILS: '/student/projects/:id',
    CREDITS: '/student/credits',
    PROFILE: '/student/profile',
  },
  FACULTY: {
    ROOT: '/faculty',
    DASHBOARD: '/faculty/dashboard',
    CREATE_PROBLEM: '/faculty/create-problem',
    REVIEWS: '/faculty/review',
    PROFILE: '/faculty/profile',
  },
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    INSTITUTIONS: '/admin/institutions',
  },
  PRINCIPAL: {
    ROOT: '/principal',
    DASHBOARD: '/principal/dashboard',
    ANALYTICS: '/principal/analytics',
  },
} as const

/** Build a concrete path from a param template, e.g. buildPath(ROUTES.SHARED.PORTFOLIO, { id: '42' }). */
export function buildPath(
  template: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, String(value)),
    template,
  )
}
