/**
 * Authentication provider.
 *
 * `login` posts real credentials to /api/v1/auth/login and keeps the returned
 * user and tokens in localStorage, so a refresh keeps you signed in.
 *
 * This provider is the sole owner of the session: it pushes the current access
 * token into the API client, so nothing else needs to know about auth state. It
 * also registers the client's two session hooks — renew and sign-out — so an
 * expired access token is renewed in one place rather than ending the session,
 * and only a session that cannot be renewed sends the user back to the login
 * page. Both are registered at module scope, not in an effect: a page's own
 * data effects run before the provider's, and the very first request of a
 * reloaded tab must already carry the stored token.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import type { User } from '@/types'
import { setAccessToken, setRefreshHandler, setUnauthorizedHandler } from '@/api/client'
import * as authApi from '@/api/auth'

const STORAGE_KEY = 'crce_user'
const TOKEN_KEY = 'crce_access_token'
const REFRESH_KEY = 'crce_refresh_token'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function store(session: authApi.Session): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_KEY, session.refreshToken)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session.user))
  setAccessToken(session.accessToken)
}

function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  setAccessToken(null)
}

// Restore the token before the first render, so no page can out-race it.
setAccessToken(readStoredUser() ? localStorage.getItem(TOKEN_KEY) : null)

/**
 * Renew the access token from the stored refresh token. The backend rotates,
 * so the new pair replaces the old one; a refusal means the session is really
 * over and the client falls through to the sign-out hook.
 */
async function renew(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null
  try {
    const session = await authApi.refresh(refreshToken)
    store(session)
    return session.accessToken
  } catch {
    return null
  }
}

setRefreshHandler(renew)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password)
    store(session)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(() => {
    // Revoke the refresh token server-side before dropping it: forgetting a
    // fourteen-day token locally does not stop anyone else from using it.
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (refreshToken) void authApi.logout(refreshToken).catch(() => undefined)
    clearStorage()
    setUser(null)
  }, [])

  // The client's sign-out hook. An effect is soon enough for this one: it only
  // fires after a renewal has already been tried and refused, which is a
  // network round trip away.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
