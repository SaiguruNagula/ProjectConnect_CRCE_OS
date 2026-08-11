/**
 * The faculty Review Engine workflow: the stage queues, the submission being
 * reviewed, and the three mutations a reviewer performs — decide a stage, award
 * credits, publish or keep internal. Every rule (which decisions are legal,
 * what a decision unlocks, what a credit total comes to) lives below this hook
 * in reviewsService → repository → API. The hook only sequences calls and
 * reports the outcome.
 */
import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { reviewsService } from '@/services/catalog.service'
import type {
  CreditAwardInput,
  ProjectJourney,
  ReviewQueueId,
  ReviewQueues,
  StageReviewInput,
} from '@/types/domain'

const EMPTY_QUEUES: ReviewQueues = { idea: [], poc: [], final: [], completed: [] }

export function useFacultyReview() {
  const { data, loading, error, reload } = useAsync<ReviewQueues>(() => reviewsService.queues())
  const [queue, setQueue] = useState<ReviewQueueId>('idea')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const queues = data ?? EMPTY_QUEUES
  const items = queues[queue]
  // The pick follows the queue: an id from another tab is not a valid selection.
  const selected = items.find((i) => i.projectId === selectedId) ?? items[0] ?? null
  const selectedProjectId = selected?.projectId

  const detail = useAsync<ProjectJourney | null>(
    () => (selectedProjectId ? reviewsService.detail(selectedProjectId) : Promise.resolve(null)),
    [selectedProjectId],
  )
  const reloadDetail = detail.reload

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string, fallback: string) => {
      setBusy(true)
      setActionError(null)
      try {
        await action()
        setActionMessage(message)
        reload()
        reloadDetail()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallback)
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload, reloadDetail],
  )

  const decide = useCallback(
    (input: StageReviewInput, message: string) =>
      run(() => reviewsService.decide(input), message, 'Could not record your review. Please try again.'),
    [run],
  )

  const awardCredits = useCallback(
    (input: CreditAwardInput) =>
      run(
        () => reviewsService.awardCredits(input),
        'Credits awarded — the Credit Engine will process them.',
        'Could not award credits. Please try again.',
      ),
    [run],
  )

  const setPublication = useCallback(
    (projectId: string, publish: boolean) =>
      run(
        () => reviewsService.setPublication({ projectId, publish }),
        publish ? 'Published to the Solutions Hub.' : 'Kept internal — not published.',
        'Could not update the publication status. Please try again.',
      ),
    [run],
  )

  return {
    queues,
    queue,
    /** Switching queues clears the pick so the new queue opens on its first card. */
    selectQueue: (next: ReviewQueueId) => {
      setQueue(next)
      setSelectedId(null)
    },
    items,
    selected,
    selectItem: setSelectedId,
    journey: detail.data ?? null,
    detailLoading: detail.loading,
    detailError: detail.error,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    decide,
    awardCredits,
    setPublication,
  }
}
