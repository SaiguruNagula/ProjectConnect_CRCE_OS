/**
 * Create-Problem submission state. Posts the authoring payload through
 * problemsService (publish or save-draft) and tracks submitting/success/error —
 * keeping the mutation out of the form UI (Component → Hook → Service →
 * Repository → API). The form state itself lives in the page (React Hook Form).
 */
import { useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type { CreateProblemInput, Problem, ProblemDraft } from '@/types/domain'

type Result = { kind: 'published'; title: string } | { kind: 'draft' }

/** @param draftId Resume a saved draft — exposed as `draft` once it loads. */
export function useCreateProblem(draftId?: string) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const draftsQuery = useAsync<ProblemDraft[]>(() => problemsService.drafts())

  const draft = useMemo(
    () => (draftId ? (draftsQuery.data ?? []).find((d) => d.id === draftId) ?? null : null),
    [draftsQuery.data, draftId],
  )

  async function publish(input: CreateProblemInput): Promise<Problem | undefined> {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const problem = await problemsService.create(input)
      setResult({ kind: 'published', title: problem.title })
      return problem
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish the problem. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveDraft(input: CreateProblemInput): Promise<void> {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await problemsService.saveDraft(input)
      setResult({ kind: 'draft' })
      draftsQuery.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the draft. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    submitting,
    result,
    error,
    draft,
    drafts: draftsQuery.data ?? [],
    publish,
    saveDraft,
    dismiss: () => setResult(null),
  }
}
