/**
 * API client — PLACEHOLDER.
 *
 * Centralizes where HTTP calls will live so components never call fetch()
 * directly (CLAUDE.md §11). No real requests are made in the frontend
 * foundation phase; methods intentionally throw until the backend exists.
 */
import type { ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function notImplemented(method: string, path: string): never {
  throw new Error(
    `API not implemented yet: ${method} ${API_BASE_URL}${path}. ` +
      `Backend integration is a later phase.`,
  )
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get: <T = unknown>(path: string): Promise<ApiResponse<T>> =>
    notImplemented('GET', path),
  post: <T = unknown>(path: string, _body?: unknown): Promise<ApiResponse<T>> =>
    notImplemented('POST', path),
  put: <T = unknown>(path: string, _body?: unknown): Promise<ApiResponse<T>> =>
    notImplemented('PUT', path),
  patch: <T = unknown>(path: string, _body?: unknown): Promise<ApiResponse<T>> =>
    notImplemented('PATCH', path),
  delete: <T = unknown>(path: string): Promise<ApiResponse<T>> =>
    notImplemented('DELETE', path),
}
