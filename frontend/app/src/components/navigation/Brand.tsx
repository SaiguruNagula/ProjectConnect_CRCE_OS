import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/** Product wordmark, links home. Shared across all chrome. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to={ROUTES.PUBLIC.HOME}
      className={`flex items-center gap-xs font-display text-lg font-bold text-on-surface ${className ?? ''}`}
    >
      <span className="material-symbols-outlined text-secondary" aria-hidden="true">
        hub
      </span>
      <span>CRCE&nbsp;OS</span>
    </Link>
  )
}
