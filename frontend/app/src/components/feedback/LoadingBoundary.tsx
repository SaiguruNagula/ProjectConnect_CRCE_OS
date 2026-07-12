/**
 * Suspense wrapper providing a consistent loading fallback for lazily-loaded
 * routes (UI_UX_GUIDELINES §27 — never a blank white page).
 */
import { Suspense, type ReactNode } from 'react'

export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full items-center justify-center"
    >
      <span
        className="material-symbols-outlined animate-spin text-[32px] text-on-surface-variant"
        aria-hidden="true"
      >
        progress_activity
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function LoadingBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}
