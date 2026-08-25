/**
 * Review engine repository — live (Phase 9).
 *
 * Five methods, five endpoints that already existed. The Review Engine decides
 * what a verdict means, the Credit Engine prices an award and the projects
 * module owns publication; this file carries the request there and the journey
 * back. It contains no rule about which decisions are legal, what an approval
 * unlocks or what a project is worth — asking the backend and rendering its
 * answer is the whole contract.
 *
 * Three endpoints answer with the same `ProjectJourney` the student reads, so
 * every mutation returns the authoritative next state and the panel re-renders
 * from it rather than from a guess.
 */
import { apiClient } from '@/api/client'
import { camelize, decamelize } from '@/api/case'
import { optional } from '@/repositories/api/projects.repository'
import type { ReviewRepository } from '@/repositories/types'
import type {
  CreditAwardInput,
  ProjectJourney,
  PublicationInput,
  ReviewQueueId,
  ReviewQueueItem,
  ReviewQueues,
  StageReviewInput,
} from '@/types/domain'

const QUEUES: ReviewQueueId[] = ['idea', 'poc', 'final', 'completed']

/**
 * One card as GET /reviews/queues sends it. Three fields are named differently
 * on the wire; the rest are the domain type's own, so a field added to the card
 * is a field added here.
 */
type QueueItemBody = Omit<ReviewQueueItem, 'projectId' | 'problemTitle' | 'attachments'> & {
  id: string
  projectTitle: string
  problemTitle: string | null
  attachmentCount: number
}

function toQueueItem({
  id,
  projectTitle,
  problemTitle,
  attachmentCount,
  ...rest
}: QueueItemBody): ReviewQueueItem {
  return {
    ...rest,
    projectId: id,
    // A project always answers a problem, so the title is null only when that
    // problem is gone. The card still needs a heading, and the project's own
    // title is the truest one left — never a placeholder.
    problemTitle: problemTitle ?? projectTitle,
    attachments: attachmentCount,
  }
}

export const reviewsApiRepository: ReviewRepository = {
  queues: async () => {
    const { data } = await apiClient.get<unknown>('/reviews/queues')
    const body = camelize<Record<ReviewQueueId, QueueItemBody[]>>(data)
    // Oldest first is already the order the backend sends; this only renames.
    return Object.fromEntries(
      QUEUES.map((queue) => [queue, body[queue].map(toQueueItem)]),
    ) as ReviewQueues
  },

  detail: (projectId: string) => optional<ProjectJourney>(`/reviews/${projectId}`),

  decide: async ({ projectId, stage, decision, review }: StageReviewInput) => {
    // The panel nests its feedback under `review`; the endpoint takes it flat
    // and forbids anything it does not name. `reviewedBy` is deliberately not
    // sent — the reviewer is the token's subject, not the form's.
    const { strengths, weaknesses, suggestions, comments, evaluation } = review
    const { data } = await apiClient.post<unknown>(
      `/reviews/${projectId}/${stage}`,
      decamelize({ decision, strengths, weaknesses, suggestions, comments, evaluation }),
    )
    return camelize<ProjectJourney>(data)
  },

  awardCredits: async ({ projectId, ...components }: CreditAwardInput) => {
    // The five components only. The total, the ceiling and the ledger are the
    // Credit Engine's, and it recomputes all three from these numbers.
    const { data } = await apiClient.post<unknown>(
      `/projects/${projectId}/credits`,
      decamelize(components),
    )
    return camelize<ProjectJourney>(data)
  },

  setPublication: async ({ projectId, publish }: PublicationInput) => {
    const { data } = await apiClient.post<unknown>(`/projects/${projectId}/publication`, { publish })
    return camelize<ProjectJourney>(data)
  },
}
