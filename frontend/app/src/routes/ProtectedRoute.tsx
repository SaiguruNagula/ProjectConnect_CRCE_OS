/**
 * Protected route — the frontend half of authorization.
 *
 * Redirects to /login when signed out, and to the user's own dashboard when
 * they try to open a section their role does not have. Typing the URL by hand
 * is the case this exists for; the security boundary is still the backend,
 * which refuses the same calls with a 403 (DECISIONS.md §6).
 *
 * `allow` omitted means "any signed-in role" — the shared pages, whose data
 * every workspace reads but no anonymous visitor can.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { ROLE_HOME } from '@/constants/navigation'

export function ProtectedRoute({ allow }: { allow?: Role | Role[] }) {
  const { user } = useAuth()
  const location = useLocation()

  // Remember where they were headed, so signing in resumes the journey rather
  // than dropping everyone on their dashboard.
  if (!user) {
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace state={{ from: location.pathname }} />
  }

  const allowed = allow === undefined || (Array.isArray(allow) ? allow : [allow]).includes(user.role)
  if (!allowed) return <Navigate to={ROLE_HOME[user.role]} replace />

  return <Outlet />
}
