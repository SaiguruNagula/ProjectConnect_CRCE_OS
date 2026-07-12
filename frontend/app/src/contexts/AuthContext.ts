/**
 * Authentication context + hook — PLACEHOLDER.
 * Context object and consumer hook only (no component) so fast-refresh stays
 * granular. The provider lives in providers/AuthProvider.tsx.
 */
import { createContext, useContext } from 'react'
import type { User } from '@/types'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
