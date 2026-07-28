/**
 * Navigation configuration — drives every menu so links are never hardcoded in
 * chrome components. Entries follow the per-role navigation defined in
 * UI_UX_GUIDELINES.md §20. Icon names are Material Symbols (Stitch parity).
 */
import type { NavItem, Role } from '@/types'
import { ROUTES, buildPath } from '@/constants/routes'

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Home', to: ROUTES.PUBLIC.HOME, icon: 'home' },
  { label: 'About', to: ROUTES.PUBLIC.ABOUT, icon: 'info' },
  { label: 'Open Problems', to: ROUTES.SHARED.OPEN_PROBLEMS, icon: 'lightbulb' },
  { label: 'Solutions', to: ROUTES.SHARED.SOLUTIONS, icon: 'apps' },
  { label: 'Leaderboard', to: ROUTES.SHARED.LEADERBOARD, icon: 'leaderboard' },
]

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', to: ROUTES.STUDENT.DASHBOARD, icon: 'dashboard' },
  // Innovation Hub is deliberately absent: a student's journey starts at Open
  // Problems. The route still exists for the public site and faculty.
  { label: 'Open Problems', to: ROUTES.SHARED.OPEN_PROBLEMS, icon: 'lightbulb' },
  { label: 'My Projects', to: ROUTES.STUDENT.PROJECTS, icon: 'folder' },
  { label: 'Credits', to: ROUTES.STUDENT.CREDITS, icon: 'stars' },
  { label: 'Leaderboard', to: ROUTES.SHARED.LEADERBOARD, icon: 'leaderboard' },
  { label: 'Portfolio', to: buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' }), icon: 'badge' },
  { label: 'Profile', to: ROUTES.STUDENT.PROFILE, icon: 'person' },
]

export const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard', to: ROUTES.FACULTY.DASHBOARD, icon: 'dashboard' },
  { label: 'Innovation Hub', to: ROUTES.SHARED.INNOVATION_HUB, icon: 'hub' },
  { label: 'Create Problem', to: ROUTES.FACULTY.CREATE_PROBLEM, icon: 'add_circle' },
  { label: 'Reviews', to: ROUTES.FACULTY.REVIEWS, icon: 'rate_review' },
  { label: 'Leaderboard', to: ROUTES.SHARED.LEADERBOARD, icon: 'leaderboard' },
  { label: 'Profile', to: ROUTES.FACULTY.PROFILE, icon: 'person' },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', to: ROUTES.ADMIN.DASHBOARD, icon: 'dashboard' },
  { label: 'Users', to: ROUTES.ADMIN.USERS, icon: 'group' },
  { label: 'Institutions', to: ROUTES.ADMIN.INSTITUTIONS, icon: 'apartment' },
]

export const PRINCIPAL_NAV: NavItem[] = [
  { label: 'Dashboard', to: ROUTES.PRINCIPAL.DASHBOARD, icon: 'dashboard' },
  { label: 'Analytics', to: ROUTES.PRINCIPAL.ANALYTICS, icon: 'analytics' },
  { label: 'Leaderboard', to: ROUTES.SHARED.LEADERBOARD, icon: 'leaderboard' },
]

/** Role → sidebar navigation. */
export const ROLE_NAV: Record<Role, NavItem[]> = {
  student: STUDENT_NAV,
  faculty: FACULTY_NAV,
  admin: ADMIN_NAV,
  principal: PRINCIPAL_NAV,
}
