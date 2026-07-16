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

/**
 * Standard API response envelope (API_SPEC.md). Declared now so services and the
 * API client share one contract; not yet used for real requests.
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}
