/**
 * Notification feed state — loads the cross-cutting feed and owns the read
 * mutations. Every module that performs an action raises a notification in the
 * repository/backend, so this hook is the only place the UI reads them from
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { notificationsService } from '@/services/catalog.service'
import type { Notification } from '@/types/domain'

export function useNotifications() {
  const { data, loading, error, reload } = useAsync<Notification[]>(() =>
    notificationsService.list(),
  )
  const [actionError, setActionError] = useState<string | null>(null)

  const notifications = useMemo(() => data ?? [], [data])
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const run = useCallback(
    async (action: () => Promise<Notification[]>, fallback: string) => {
      setActionError(null)
      try {
        await action()
        reload()
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallback)
      }
    },
    [reload],
  )

  const markRead = useCallback(
    (id: string) =>
      run(() => notificationsService.markRead(id), 'Could not update the notification.'),
    [run],
  )

  const markAllRead = useCallback(
    () => run(() => notificationsService.markAllRead(), 'Could not update the notifications.'),
    [run],
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload,
    actionError,
    dismissError: () => setActionError(null),
    markRead,
    markAllRead,
  }
}
