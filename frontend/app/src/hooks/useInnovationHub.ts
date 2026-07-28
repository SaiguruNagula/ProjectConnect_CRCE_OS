/**
 * Innovation Hub state — the public marketplace overview. Loads the same
 * problems, solutions and campus metrics the rest of the app uses, and owns the
 * search + department filter. Nothing on the page is hardcoded
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { analyticsService, problemsService, solutionsService } from '@/services/catalog.service'
import type { NameValue, Problem, Solution } from '@/types/domain'

/** How many entries each rail shows before "view all". */
const RAIL_SIZE = 3

function matchesQuery(haystack: string[], query: string): boolean {
  if (!query) return true
  return haystack.some((field) => field.toLowerCase().includes(query))
}

export function useInnovationHub() {
  const problemsQuery = useAsync<Problem[]>(() => problemsService.list())
  const solutionsQuery = useAsync<Solution[]>(() => solutionsService.list())
  const impactQuery = useAsync<NameValue[]>(() => analyticsService.campusImpact())
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')

  const problems = useMemo(() => problemsQuery.data ?? [], [problemsQuery.data])
  const solutions = useMemo(() => solutionsQuery.data ?? [], [solutionsQuery.data])

  /** Filter chips come from the live problem departments, not a fixed list. */
  const departments = useMemo(
    () => Array.from(new Set(problems.map((p) => p.department))).sort(),
    [problems],
  )

  const q = query.trim().toLowerCase()

  /** Featured = open, highest credit reward first — ranked here, not in the page. */
  const featuredProblems = useMemo(
    () =>
      problems
        .filter(
          (p) =>
            p.status !== 'closed' &&
            (!department || p.department === department) &&
            matchesQuery([p.title, p.summary, p.facultyName, ...p.skills], q),
        )
        .sort((a, b) => b.creditReward - a.creditReward)
        .slice(0, RAIL_SIZE),
    [problems, department, q],
  )

  const featuredSolutions = useMemo(
    () =>
      solutions
        .filter(
          (s) => s.status === 'live' && matchesQuery([s.name, s.description, s.category, ...s.tags], q),
        )
        .slice(0, RAIL_SIZE),
    [solutions, q],
  )

  const clearFilters = useCallback(() => {
    setQuery('')
    setDepartment('')
  }, [])

  return {
    featuredProblems,
    featuredSolutions,
    departments,
    impact: impactQuery.data ?? [],
    query,
    setQuery,
    department,
    setDepartment,
    clearFilters,
    filtered: q !== '' || department !== '',
    loading: problemsQuery.loading || solutionsQuery.loading,
    error: problemsQuery.error ?? solutionsQuery.error,
  }
}
