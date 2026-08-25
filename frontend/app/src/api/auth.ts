/**
 * The auth endpoints, kept out of client.ts (which defines none by design) and
 * out of repositories/ (sign-in is not a data read — it is what makes the data
 * reads possible). AuthProvider is the only caller, because it is the only
 * owner of the session.
 */
import { apiClient } from '@/api/client'
import type { Role, User } from '@/types'

/** `TokenPair` as the backend serialises it — snake_case, translated once here. */
interface TokenPairBody {
  access_token: string
  refresh_token: string
  token_type: string
  user: { id: string; name: string; email: string; role: Role }
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

function toSession(data: TokenPairBody): Session {
  const { id, name, role } = data.user
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: { id, name, email: data.user.email, role },
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const { data } = await apiClient.post<TokenPairBody>('/auth/login', { email, password })
  return toSession(data)
}

/**
 * Trade the refresh token for a fresh pair. The backend rotates: the token
 * passed in is revoked, so the caller must store the one that comes back.
 */
export async function refresh(refreshToken: string): Promise<Session> {
  const { data } = await apiClient.post<TokenPairBody>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return toSession(data)
}

/** Revoke the refresh token server-side. Signing out locally is not enough. */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refresh_token: refreshToken })
}
