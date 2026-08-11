/**
 * Global application types.
 *
 * Foundation-only: these describe the shell (roles, navigation, the API envelope
 * contract from API_SPEC.md). No business logic. Domain models arrive with their
 * feature slices in later phases.
 */

/** The four primary roles defined in DECISIONS.md / RBAC. */
export type Role = 'student' | 'faculty' | 'admin' | 'principal'

/** Minimal user shape for shell placeholders. Real model is defined at auth time. */
export interface User {
  id: string
  name: string
  email: string
  role: Role
}

/** A single navigation entry, driven by config rather than hardcoded links. */
export interface NavItem {
  /** Visible label. */
  label: string
  /** Target path (from ROUTES). */
  to: string
  /** Material Symbols icon name (matches the Stitch prototypes). */
  icon?: string
}

/** Standard success envelope — API_SPEC.md "Standard Success Response". */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

/** One field-level failure inside an error envelope. */
export interface ApiFieldError {
  field: string
  message: string
}

/** Standard error envelope — API_SPEC.md "Standard Error Fields". */
export interface ApiErrorBody {
  success: false
  message: string
  errors?: ApiFieldError[]
  error_code?: string
  timestamp?: string
  path?: string
}

/** Pagination metadata returned with every collection (API_SPEC.md §Pagination). */
export interface PaginationMeta {
  page: number
  limit: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/** `data` payload of a paginated collection response. */
export interface Paginated<T> {
  items: T[]
  pagination: PaginationMeta
}

/** Standard collection query string. Defaults: page 1, limit 20 (max 100). */
export interface PageQuery {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  filter?: string
}
