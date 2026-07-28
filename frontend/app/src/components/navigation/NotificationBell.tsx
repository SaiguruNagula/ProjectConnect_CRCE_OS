/**
 * Notification bell + panel. The single UI surface for the cross-cutting feed
 * every module raises into. Reads and mutates through useNotifications, so no
 * notification state or business logic lives in a page.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notification, NotificationKind } from '@/types/domain'
import { relativeTime } from '@/utils/date'
import { EmptyState } from '@/components/ui/EmptyState'

const KIND_ICON: Record<NotificationKind, { icon: string; className: string }> = {
  success: { icon: 'check_circle', className: 'text-[#1e7a3d]' },
  info: { icon: 'info', className: 'text-secondary' },
  warning: { icon: 'warning', className: 'text-[#9a5b00]' },
  error: { icon: 'error', className: 'text-error' },
}

export function NotificationBell() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // ponytail: pointerdown/Escape close is enough here; swap for a focus-trapping
  // dialog primitive if the app ever grows a real modal system.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const openNotification = (notification: Notification) => {
    if (!notification.read) markRead(notification.id)
    if (notification.link) {
      setOpen(false)
      navigate(notification.link)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative rounded-lg p-xs text-on-surface-variant hover:bg-surface-container-high"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-on-error">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-20 mt-xs w-80 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-outline-variant px-sm py-xs">
            <h2 className="text-sm font-semibold text-on-surface">Notifications</h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-secondary hover:underline disabled:cursor-not-allowed disabled:text-on-surface-variant disabled:no-underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="px-sm py-md text-sm text-on-surface-variant">Loading notifications…</p>
            )}
            {!loading && error && <p className="px-sm py-md text-sm text-error">{error}</p>}
            {!loading && !error && notifications.length === 0 && (
              <div className="p-sm">
                <EmptyState
                  icon="notifications_off"
                  title="You're all caught up"
                  description="Actions across problems, teams, reviews and credits show up here."
                />
              </div>
            )}
            {!loading &&
              !error &&
              notifications.map((notification) => {
                const kind = KIND_ICON[notification.kind]
                return (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full gap-sm border-b border-outline-variant/60 px-sm py-sm text-left last:border-b-0 hover:bg-surface-container-high ${
                      notification.read ? '' : 'bg-secondary-container/10'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${kind.className}`}
                      aria-hidden="true"
                    >
                      {kind.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-xs">
                        <span className="truncate text-sm font-medium text-on-surface">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-xs text-on-surface-variant">
                          {relativeTime(notification.timestamp)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-on-surface-variant">
                        {notification.message}
                      </span>
                    </span>
                    {!notification.read && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
