/**
 * Protected route — DEMO enforcement.
 *
 * Redirects to /login when signed out, and to the user's own dashboard when
 * they try to open another role's section. This is UI gating for the demo only;
 * real authorization is enforced by the backend (DECISIONS.md §6).
 */
import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

const ROLE_HOME: Record<Role, string> = {
  student: ROUTES.STUDENT.DASHBOARD,
  faculty: ROUTES.FACULTY.DASHBOARD,
  admin: ROUTES.ADMIN.DASHBOARD,
  principal: ROUTES.PRINCIPAL.DASHBOARD,
}

export function ProtectedRoute({ allow }: { allow: Role }) {
  const { user } = useAuth()

  if (!user) return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />
  if (user.role !== allow) return <Navigate to={ROLE_HOME[user.role]} replace />

  return <Outlet />
}
