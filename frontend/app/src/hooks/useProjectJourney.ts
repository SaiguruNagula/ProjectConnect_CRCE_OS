/**
 * The four-stage submission journey for one project — Idea, Proof of Concept,
 * Faculty Selection, Final Project. Resolves the project (by id, or the current
 * one for the shared /project route), then routes every save and submit through
 * projectsService. Stage order, unlocking and status transitions are decided by
 * the repository/backend, so the workspace only renders what it is given
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type {
  FinalSubmission,
  IdeaSubmission,
  PocSubmission,
  ProjectJourney,
} from '@/types/domain'

/** @param id Omit for the shared route, which opens the current project. */
export function useProjectJourney(id?: string) {
  const loader = useMemo(
    () =>
      id
        ? () => projectsService.journey(id)
        : () =>
            projectsService.list().then((list) => {
              const project = list.find((p) => p.status !== 'completed') ?? list[0]
              return project ? projectsService.journey(project.id) : null
            }),
    [id],
  )

  const { data, loading, error, reload } = useAsync<ProjectJourney | null>(loader, [id])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const projectId = data?.projectId

  const run = useCallback(
    async (action: (projectId: string) => Promise<unknown>, message: string, fallback: string) => {
      if (!projectId) return false
      setBusy(true)
      setActionError(null)
      try {
        await action(projectId)
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
    [projectId, reload],
  )

  const saved = (submit: boolean, what: string) =>
    submit ? `${what} submitted — faculty will review it.` : `${what} draft saved.`
  const failed = (what: string) => `Could not save your ${what}. Please try again.`

  const saveIdea = useCallback(
    (values: IdeaSubmission, submit: boolean) =>
      run((pid) => projectsService.saveIdea(pid, values, submit), saved(submit, 'Idea'), failed('idea')),
    [run],
  )

  const savePoc = useCallback(
    (values: PocSubmission, submit: boolean) =>
      run(
        (pid) => projectsService.savePoc(pid, values, submit),
        saved(submit, 'Proof of concept'),
        failed('proof of concept'),
      ),
    [run],
  )

  const saveFinal = useCallback(
    (values: FinalSubmission, submit: boolean) =>
      run(
        (pid) => projectsService.saveFinal(pid, values, submit),
        saved(submit, 'Final project'),
        failed('final project'),
      ),
    [run],
  )

  return {
    journey: data ?? null,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    saveIdea,
    savePoc,
    saveFinal,
    reload,
  }
}
