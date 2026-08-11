/**
 * Authentication provider — DEMO implementation.
 *
 * Persists a chosen demo user in localStorage so refreshes keep you signed in.
 * `login(role)` selects a representative user; there is no password.
 *
 * This provider is the sole owner of the access token: it pushes the current
 * token into the API client on every session change, so nothing else needs to
 * know about auth state. Demo sessions have no token, which is why every read
 * still goes through the mock repositories. Swapping in real JWT auth means
 * replacing `login` with `POST /api/v1/auth/login` and storing the returned
 * token — the useAuth() contract and every consumer stay unchanged.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import type { Role, User } from '@/types'
import { setAccessToken } from '@/api/client'
import { DEMO_USERS } from '@/mocks/users'

const STORAGE_KEY = 'crce_demo_user'
const TOKEN_KEY = 'crce_access_token'

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

  // Restore the token on boot and keep the API client in sync with the session.
  useEffect(() => {
    setAccessToken(user ? localStorage.getItem(TOKEN_KEY) : null)
  }, [user])

  const login = useCallback((role: Role) => {
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
