/**
 * One problem plus everything linked to it — the projects built against it and
 * the solutions it shipped — so the details page can navigate the full
 * Problem → Project → Solution chain. Owns the bookmark mutation
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { problemsService, projectsService, solutionsService } from '@/services/catalog.service'
import type { Problem, Project, Solution } from '@/types/domain'

export function useProblemDetails(id: string) {
  const problemQuery = useAsync<Problem | null>(() => problemsService.get(id), [id])
  const projectsQuery = useAsync<Project[]>(() => projectsService.list())
  const solutionsQuery = useAsync<Solution[]>(() => solutionsService.list())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const problem = problemQuery.data ?? null

  /** Related entities are matched by id here, never by title in the page. */
  const projects = useMemo(
    () => (projectsQuery.data ?? []).filter((p) => p.problemId === id),
    [projectsQuery.data, id],
  )
  const solutions = useMemo(
    () => (solutionsQuery.data ?? []).filter((s) => s.problemId === id),
    [solutionsQuery.data, id],
  )

  const reload = problemQuery.reload

  const toggleBookmark = useCallback(async () => {
    if (!problem) return
    setBusy(true)
    setActionError(null)
    try {
      await problemsService.setBookmark(problem.id, !problem.bookmarked)
      reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the bookmark.')
    } finally {
      setBusy(false)
    }
  }, [problem, reload])

  return {
    problem,
    projects,
    solutions,
    loading: problemQuery.loading,
    error: problemQuery.error,
    busy,
    actionError,
    dismissError: () => setActionError(null),
    toggleBookmark,
  }
}
