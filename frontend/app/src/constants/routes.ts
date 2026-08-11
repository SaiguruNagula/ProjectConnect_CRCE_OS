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

/**
 * Append a query string, dropping empty values —
 * withQuery(ROUTES.SHARED.TEAM_FORMATION, { problem: 'p-01' }) → '/team?problem=p-01'.
 * Used to carry entity context across shared routes that take no path param.
 */
export function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

/** Query-param names shared between the pages that write and read them. */
export const QUERY_PARAMS = {
  /** Scopes Team Formation to one problem. */
  PROBLEM: 'problem',
  /** Pre-fills a catalog search box. */
  SEARCH: 'q',
  /** Resumes a saved problem draft in the authoring form. */
  DRAFT: 'draft',
} as const
