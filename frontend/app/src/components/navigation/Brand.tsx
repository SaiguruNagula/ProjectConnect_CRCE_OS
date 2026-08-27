import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ROLE_HOME } from '@/constants/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Product wordmark. "Home" is context-aware: the public landing page for
 * anonymous visitors, the signed-in user's own dashboard otherwise — never a
 * marketing page rendered inside authenticated chrome.
 */
export function Brand({ className }: { className?: string }) {
  const { user } = useAuth()

  return (
    <Link
      to={user ? ROLE_HOME[user.role] : ROUTES.PUBLIC.HOME}
      className={`flex items-center gap-xs font-display text-lg font-bold text-on-surface ${className ?? ''}`}
    >
      <span className="material-symbols-outlined text-secondary" aria-hidden="true">
        hub
      </span>
      <span>CRCE&nbsp;OS</span>
    </Link>
  )
}
