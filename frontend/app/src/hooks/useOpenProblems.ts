/**
 * Open Problems catalog state. Owns the API-ready query — page, limit, search,
 * department, saved-only and sort — and hands it to problemsService, which
 * returns the page plus its facets and counters. Filtering, sorting, slicing and
 * page-count maths all happen below this hook, never in a component
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type { ProblemCatalogPage, ProblemQuery } from '@/types/domain'

/** Cards per page, matching the two-column grid. */
export const PROBLEMS_PER_PAGE = 6

export function useOpenProblems(initialSearch = '') {
  const [query, setQuery] = useState<ProblemQuery>({
    page: 1,
    limit: PROBLEMS_PER_PAGE,
    search: initialSearch,
    department: '',
    savedOnly: false,
    sort: 'newest',
  })

  const { data, loading, error, reload } = useAsync<ProblemCatalogPage>(
    () => problemsService.page(query),
    [query],
  )

  /** Any filter change collapses the result set — always return to page 1. */
  const setFilter = useCallback(
    <K extends keyof ProblemQuery>(key: K, value: ProblemQuery[K]) =>
      setQuery((current) => ({ ...current, [key]: value, page: 1 })),
    [],
  )

  const setPage = useCallback(
    (page: number) => setQuery((current) => ({ ...current, page })),
    [],
  )

  return {
    query,
    setFilter,
    setPage,
    problems: data?.items ?? [],
    /** Every department in the catalog, so a filter never hides its own chip. */
    departments: data?.departments ?? [],
    stats: data?.stats ?? { problems: 0, departments: 0, teams: 0 },
    /** The page actually served — the repository clamps out-of-range requests. */
    page: data?.page ?? query.page,
    totalPages: data?.totalPages ?? 1,
    total: data?.total ?? 0,
    loading,
    error,
    reload,
  }
}
