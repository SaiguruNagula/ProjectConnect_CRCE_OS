/**
 * Stage 3 from the faculty side — the proposals waiting for a selection
 * decision. The queue is whichever projects the service reports as sitting at
 * the selection stage; the decision itself (and everything it unlocks) is
 * applied below this hook (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Project, SelectionDecisionInput } from '@/types/domain'

export function useSelectionReview() {
  const projects = useAsync<Project[]>(() => projectsService.list())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const queue = useMemo(
    () => (projects.data ?? []).filter((p) => p.stage === 'selection'),
    [projects.data],
  )

  const reload = projects.reload

  const decide = useCallback(
    async (input: SelectionDecisionInput) => {
      setBusy(true)
      setActionError(null)
      try {
        await projectsService.decideSelection(input)
        setActionMessage(
          input.decision === 'selected'
            ? 'Team selected for final development.'
            : input.decision === 'changes_requested'
              ? 'Changes requested — the team has your feedback.'
              : 'Proposal not selected — the team has your feedback.',
        )
        reload()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Could not record the decision. Please try again.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload],
  )

  return {
    queue,
    loading: projects.loading,
    error: projects.error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    decide,
    reload,
  }
}
