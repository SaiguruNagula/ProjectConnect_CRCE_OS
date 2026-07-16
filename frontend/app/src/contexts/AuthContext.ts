/**
 * Authentication context + hook — DEMO implementation.
 * Context object and consumer hook only (no component); provider lives in
 * providers/AuthProvider.tsx. Demo auth swaps a role locally — no backend.
 */
import { createContext, useContext } from 'react'
import type { Role, User } from '@/types'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** Demo login: sign in as a representative user for the given role. */
  login: (role: Role) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
