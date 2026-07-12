/**
 * Protected route wrapper — PLACEHOLDER (STEP 8: placeholder protected routes only).
 *
 * Today this is a pass-through so role sections are reachable without login.
 * The intended role is exposed via Outlet context so real RBAC (backend-enforced)
 * can be dropped in here later without changing the router shape.
 */
import { Outlet } from 'react-router-dom'
import type { Role } from '@/types'

export interface ProtectedContext {
  allowedRole: Role
}

export function ProtectedRoute({ allow }: { allow: Role }) {
  // ponytail: no auth yet — passes through. Guard logic added in the auth phase.
  return <Outlet context={{ allowedRole: allow } satisfies ProtectedContext} />
}
