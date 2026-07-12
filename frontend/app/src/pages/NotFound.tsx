/** 404 page (UI_UX_GUIDELINES §28 — Page Not Found error state). */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-md px-md text-center">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">
        search_off
      </span>
      <h1 className="text-2xl font-semibold text-on-surface">Page not found</h1>
      <p className="max-w-md text-sm text-on-surface-variant">
        The page you are looking for doesn’t exist or has moved.
      </p>
      <Link
        to={ROUTES.PUBLIC.HOME}
        className="rounded-lg bg-primary px-md py-xs text-sm font-medium text-on-primary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        Back to home
      </Link>
    </div>
  )
}
