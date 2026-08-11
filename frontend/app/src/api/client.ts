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
import type { ApiErrorBody, ApiResponse, PageQuery } from '@/types'

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

/** Serialize `?page=1&limit=20&search=...`, dropping empty values. */
function toQuery(query?: PageQuery): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: PageQuery; signal?: AbortSignal } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}${toQuery(options.query)}`, {
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
  get: <T = unknown>(path: string, query?: PageQuery, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}
