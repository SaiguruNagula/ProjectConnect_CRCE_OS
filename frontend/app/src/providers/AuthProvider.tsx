/**
 * Authentication provider — PLACEHOLDER. Supplies a stable unauthenticated
 * state; real login/JWT arrives in the auth phase.
 */
import { useMemo, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  // ponytail: hardcoded unauthenticated state — replaced by real auth later.
  const value = useMemo<AuthContextValue>(
    () => ({ user: null, isAuthenticated: false }),
    [],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
