/**
 * Authentication context + hook.
 * Context object and consumer hook only (no component); provider lives in
 * providers/AuthProvider.tsx.
 */
import { createContext, useContext } from 'react'
import type { User } from '@/types'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /**
   * Sign in against the backend. Resolves with the signed-in user — the caller
   * needs its role to route, and reading it from state would race the render.
   * Rejects with the ApiError the request failed on.
   */
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
