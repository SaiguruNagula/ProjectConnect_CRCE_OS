/**
 * Project Workspace state — resolves the project (by id, or the representative
 * active one for the shared /project route), loads its activity feed and routes
 * milestone changes through projectsService. Progress is recomputed by the
 * repository, so the page never derives it (Component → Hook → Service →
 * Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService, projectsService } from '@/services/catalog.service'
import type { Activity, MilestoneStatus, Project } from '@/types/domain'

/** @param id Omit for the shared route, which shows the current active project. */
export function useProjectWorkspace(id?: string) {
  const loader = useMemo(
    () =>
      id
        ? () => projectsService.get(id)
        : () =>
            projectsService
              .list()
              .then((list) => list.find((p) => p.status === 'active') ?? list[0] ?? null),
    [id],
  )
  const { data: project, loading, error, reload } = useAsync<Project | null>(loader, [id])
  const { data: activity } = useAsync<Activity[]>(() => dashboardService.activity())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const projectId = project?.id

  const updateMilestone = useCallback(
    async (milestoneId: string, status: MilestoneStatus) => {
      if (!projectId) return false
      setBusy(true)
      setActionError(null)
      try {
        await projectsService.updateMilestone(projectId, milestoneId, status)
        reload()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Could not update the milestone.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [projectId, reload],
  )

  return {
    project: project ?? null,
    activity: activity ?? [],
    loading,
    error,
    busy,
    actionError,
    dismissError: () => setActionError(null),
    updateMilestone,
  }
}
