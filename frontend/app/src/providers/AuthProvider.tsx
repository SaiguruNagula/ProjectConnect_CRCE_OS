/**
 * Authentication provider — DEMO implementation.
 *
 * Persists a chosen demo user in localStorage so refreshes keep you signed in.
 * `login(role)` selects a representative user; there is no password or token.
 * Replace this with real JWT auth in the auth phase — consumers use the same
 * useAuth() contract and won't change.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import type { Role, User } from '@/types'
import { DEMO_USERS } from '@/mocks/users'

const STORAGE_KEY = 'crce_demo_user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  const login = useCallback((role: Role) => {
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
