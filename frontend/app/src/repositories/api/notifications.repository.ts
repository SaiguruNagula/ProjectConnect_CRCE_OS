/**
 * Notification repository — live (Phase 12).
 *
 * The feed is the token's: the backend reads and writes only the caller's own
 * rows, so nothing here passes a user id and nothing here filters by one.
 *
 * The row carries no `link`. A backend has no business knowing this app's URL
 * shape, so it names the entity it came from and stops; turning that into a
 * route is presentation and belongs here. Only entities whose page every
 * recipient can actually open get a link — a credit notification reaches both
 * the team and their mentor, and there is no one page that serves both, so it
 * opens nothing rather than sending half its readers somewhere they are not
 * allowed to be.
 */
import { apiClient } from '@/api/client'
import { buildPath, ROUTES } from '@/constants/routes'
import type { NotificationRepository } from '@/repositories/types'
import type { Notification, NotificationKind } from '@/types/domain'

/** The response body of GET /notifications. */
interface NotificationBody {
  id: string
  kind: string
  title: string
  message: string
  entity: string | null
  entity_id: string | null
  read: boolean
  created_at: string
}

const KINDS: readonly NotificationKind[] = ['info', 'success', 'warning', 'error']

/** Anything the backend adds later reads as neutral news rather than an error. */
function toKind(kind: string): NotificationKind {
  return KINDS.includes(kind as NotificationKind) ? (kind as NotificationKind) : 'info'
}

function toLink(entity: string | null, id: string | null): string | undefined {
  if (!id) return undefined
  // Reviews notify a project's members, who are students, so the student
  // project page is the right destination for every reader of that row.
  if (entity === 'project') return buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id })
  if (entity === 'problem') return buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id })
  if (entity === 'team') return ROUTES.SHARED.TEAM_FORMATION
  return undefined
}

function toNotification(body: NotificationBody): Notification {
  return {
    id: body.id,
    kind: toKind(body.kind),
    title: body.title,
    message: body.message,
    timestamp: body.created_at,
    read: body.read,
    link: toLink(body.entity, body.entity_id),
  }
}

/** All three routes answer with the whole feed, so they share one mapping. */
function toFeed(bodies: NotificationBody[]): Notification[] {
  return bodies.map(toNotification)
}

export const notificationsApiRepository: NotificationRepository = {
  list: async () => {
    const { data } = await apiClient.get<NotificationBody[]>('/notifications')
    return toFeed(data)
  },
  markRead: async (id: string) => {
    const { data } = await apiClient.patch<NotificationBody[]>(`/notifications/${id}/read`)
    return toFeed(data)
  },
  markAllRead: async () => {
    const { data } = await apiClient.post<NotificationBody[]>('/notifications/read-all')
    return toFeed(data)
  },
}
