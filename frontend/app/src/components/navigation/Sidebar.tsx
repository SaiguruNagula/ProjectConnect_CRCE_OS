/**
 * Role sidebar. Config-driven via NavItem[]; highlights the active route.
 * Collapses off-canvas on mobile (controlled by the parent layout).
 */
import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/types'
import { Brand } from '@/components/navigation/Brand'
import { cn } from '@/utils/cn'

interface SidebarProps {
  items: NavItem[]
  /** Mobile off-canvas open state. */
  open: boolean
  onClose: () => void
}

export function Sidebar({ items, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-inverse-surface/40 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-outline-variant px-md">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto p-sm" aria-label="Primary">
          <ul className="flex flex-col gap-base">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-xs rounded-lg px-xs py-xs text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary-container/20 text-secondary'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                    )
                  }
                >
                  {item.icon && (
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
