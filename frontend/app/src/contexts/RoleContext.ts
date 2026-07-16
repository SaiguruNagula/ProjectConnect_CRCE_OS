/**
 * Role context + hook — PLACEHOLDER. Exposes the active role for role-aware
 * chrome. No RBAC (authorization is backend-enforced). Provider lives in
 * providers/RoleProvider.tsx.
 */
import { createContext, useContext } from 'react'
import type { Role } from '@/types'

export interface RoleContextValue {
  role: Role | null
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within a RoleProvider')
  return ctx
}
