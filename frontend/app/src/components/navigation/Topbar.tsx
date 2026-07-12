/**
 * Role top bar. Holds the mobile menu toggle and a user-menu placeholder.
 * No auth logic yet — the avatar is a static placeholder.
 */

interface TopbarProps {
  onMenuClick: () => void
  roleLabel: string
}

export function Topbar({ onMenuClick, roleLabel }: TopbarProps) {
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
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-sm font-semibold text-on-surface-variant"
          aria-hidden="true"
        >
          U
        </span>
      </div>
    </header>
  )
}
