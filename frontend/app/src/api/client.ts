/**
 * API client — the single HTTP boundary. Components and services never call
 * fetch() directly (CLAUDE.md §11); repositories call this.
 *
 * Implements the transport contract from API_SPEC.md: `/api/v1` base URL, the
 * `{ success, message, data }` envelope, the documented error envelope and
 * status codes, JWT bearer auth, and `?page/&limit` pagination. It defines NO
 * endpoints — those belong to the API repositories that replace
 * repositories/mock once the backend exists.
 */
import type { ApiErrorBody, ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/** A non-2xx response, carrying the documented error envelope when present. */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null

  constructor(
    status: number,
    message: string,
    body: ApiErrorBody | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  /** 401 — the caller should sign the user out and re-authenticate. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** 403 — authenticated but not permitted; the UI should not retry. */
  get isForbidden(): boolean {
    return this.status === 403
  }
}

/**
 * Access token holder. AuthProvider owns the token's lifecycle and pushes it
 * here, so the client never imports auth state (and auth never imports HTTP).
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/**
 * Session-expiry hook. A 401 that survives a refresh attempt means the session
 * is genuinely over, and every page reacts the same way — so AuthProvider
 * registers its logout here once instead of each page checking for itself.
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/**
 * Session-renewal hook. The access token lasts fifteen minutes and the refresh
 * token fourteen days, so an expired access token is an ordinary event in a
 * working session, not a sign-out. AuthProvider registers the renewal here;
 * resolving with the new access token means "retry", `null` means "give up".
 */
let onExpired: (() => Promise<string | null>) | null = null

export function setRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  onExpired = handler
}

/**
 * The in-flight renewal, shared by every request that hits a 401 at once. A
 * page loads six panels in parallel; they must not spend six refresh tokens on
 * one expiry — and with rotation on the backend, five of them would fail.
 */
let renewal: Promise<string | null> | null = null

/** The session's own endpoints: a 401 from these is the answer, not a prompt to retry. */
const TOKEN_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout'])

function renewSession(): Promise<string | null> {
  if (!onExpired) return Promise.resolve(null)
  renewal ??= onExpired().finally(() => {
    renewal = null
  })
  return renewal
}

/**
 * Query parameters for a request: `page`/`limit`/`search` plus whatever else the
 * endpoint documents (`department`, `saved_only`, `problem_id`, `submit`…).
 */
export type QueryParams = Record<string, string | number | boolean | undefined>

/** Serialize `?page=1&limit=20&search=...`, dropping empty values. */
function toQuery(query?: QueryParams): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** One trip to the network. `token` is threaded in so a retry can carry a new one. */
async function send(
  method: string,
  path: string,
  options: { body?: unknown; query?: QueryParams; signal?: AbortSignal },
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(`${API_BASE_URL}${path}${toQuery(options.query)}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (cause) {
    // Network failure / CORS / abort — never surface a raw fetch error to the UI.
    throw new ApiError(0, 'Network error. Please check your connection and try again.', null, {
      cause,
    })
  }
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: QueryParams; signal?: AbortSignal } = {},
): Promise<ApiResponse<T>> {
  const sent = accessToken
  let response = await send(method, path, options, sent)

  // A 401 on a call that carried a token is an expired access token, not the
  // end of the session: renew once and replay. A 401 from the login call
  // itself carried no token — that is wrong credentials, and never a renewal.
  // Anything other than 401 (a 403 above all) leaves the session alone.
  // The token endpoints are excluded because the renewal runs through this
  // same function: a failing refresh must report failure, not wait on itself.
  if (response.status === 401 && sent && !TOKEN_PATHS.has(path)) {
    const renewed = await renewSession()
    if (renewed) {
      response = await send(method, path, options, renewed)
    }
    if (response.status === 401) onUnauthorized?.()
  }

  // 204 No Content carries no envelope.
  if (response.status === 204) {
    return { success: true, message: '', data: undefined as T }
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const body = (payload ?? null) as ApiErrorBody | null
    throw new ApiError(response.status, body?.message ?? response.statusText, body)
  }

  return payload as ApiResponse<T>
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get: <T = unknown>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  // POST/PUT take a query too: several write endpoints carry a `?submit=` flag
  // that decides draft-vs-submit, and it belongs in the URL, not the body.
  post: <T = unknown>(path: string, body?: unknown, query?: QueryParams) =>
    request<T>('POST', path, { body, query }),
  put: <T = unknown>(path: string, body?: unknown, query?: QueryParams) =>
    request<T>('PUT', path, { body, query }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}
