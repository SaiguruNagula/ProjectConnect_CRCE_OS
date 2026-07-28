/**
 * Student problem suggestions. Loads the signed-in user's suggestions and the
 * mentors they can nominate, and routes both sides of the workflow — the
 * student's save/submit and the mentor's decision — through problemsService.
 * A suggestion is never published from here; only a mentor's approval publishes
 * one (Component → Hook → Service → Repository → API).
 */
import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type {
  MentorOption,
  ProblemSuggestion,
  ProblemSuggestionInput,
  SuggestionDecisionInput,
} from '@/types/domain'

/**
 * @param onPublished Called after a mentor approval publishes a problem, so the
 * catalog behind the review surface can refresh.
 */
export function useProblemSuggestions(onPublished?: () => void) {
  const list = useAsync<ProblemSuggestion[]>(() => problemsService.suggestions())
  const mentorList = useAsync<MentorOption[]>(() => problemsService.mentors())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const reload = list.reload

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string, fallback: string) => {
      setBusy(true)
      setActionError(null)
      try {
        await action()
        setActionMessage(message)
        reload()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallback)
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload],
  )

  const save = useCallback(
    (input: ProblemSuggestionInput, submit: boolean, id?: string) =>
      run(
        () => problemsService.saveSuggestion(input, submit, id),
        submit
          ? 'Suggestion sent — your mentor will review it before it can be published.'
          : 'Draft saved. You can finish it later.',
        submit
          ? 'Could not send the suggestion. Please try again.'
          : 'Could not save the draft. Please try again.',
      ),
    [run],
  )

  const decide = useCallback(
    (input: SuggestionDecisionInput) =>
      run(
        async () => {
          const updated = await problemsService.decideSuggestion(input)
          if (updated.status === 'published') onPublished?.()
        },
        input.decision === 'approved'
          ? 'Approved and published to Open Problems.'
          : `Suggestion ${input.decision.replace('_', ' ')} — the student has your feedback.`,
        'Could not record the decision. Please try again.',
      ),
    [run, onPublished],
  )

  return {
    suggestions: list.data ?? [],
    mentors: mentorList.data ?? [],
    loading: list.loading || mentorList.loading,
    error: list.error ?? mentorList.error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    save,
    decide,
    reload,
  }
}
