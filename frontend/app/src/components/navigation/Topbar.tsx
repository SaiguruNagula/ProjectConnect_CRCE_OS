/**
 * Role top bar. Mobile menu toggle, notifications, and the signed-in demo user
 * with a logout action.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { initials } from '@/utils/initials'
import { ROUTES } from '@/constants/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

interface TopbarProps {
  onMenuClick: () => void
  roleLabel: string
}

export function Topbar({ onMenuClick, roleLabel }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.PUBLIC.LOGIN, { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-md">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded-lg p-xs text-on-surface-variant hover:bg-surface-container-high lg:hidden"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          menu
        </span>
      </button>
      <div className="hidden text-sm font-medium capitalize text-on-surface-variant lg:block">
        {roleLabel} workspace
      </div>
      <div className="flex items-center gap-sm">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg p-xs text-on-surface-variant hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </button>
        {user && (
          <div className="flex items-center gap-xs">
            <Avatar initials={initials(user.name)} size="sm" />
            <span className="hidden text-sm font-medium text-on-surface sm:block">{user.name}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            logout
          </span>
        </Button>
      </div>
    </header>
  )
}
