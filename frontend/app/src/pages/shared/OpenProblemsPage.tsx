/**
 * Open Problems catalog — pixel-ported from the approved Stitch prototype.
 * Search + department chips + sort over service-provided data. Filter options
 * and header stats derive from the data (never hardcoded).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import { QUERY_PARAMS } from '@/constants/routes'
import type { Problem } from '@/types/domain'
import { ProblemCard } from '@/features/problems/ProblemCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

const SORTS = ['Newest', 'Most Credits'] as const
type Sort = (typeof SORTS)[number]

const PAGE_SIZE = 6

export function OpenProblemsPage() {
  const { data, loading, error, reload } = useAsync<Problem[]>(() => problemsService.list())
  const [searchParams] = useSearchParams()
  // Seeded from ?q= so a search started on the Innovation Hub carries over.
  const [query, setQuery] = useState(searchParams.get(QUERY_PARAMS.SEARCH) ?? '')
  const [department, setDepartment] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('Newest')
  const [page, setPage] = useState(1)

  const problems = useMemo(() => data ?? [], [data])
  const departments = useMemo(
    () => Array.from(new Set(problems.map((p) => p.department))).sort(),
    [problems],
  )

  const stats = useMemo(
    () => ({
      problems: problems.length,
      departments: departments.length,
      teams: problems.filter((p) => p.currentTeamCount > 0).length,
    }),
    [problems, departments],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const matched = problems.filter(
      (p) =>
        (department === '' || p.department === department) &&
        (!savedOnly || p.bookmarked) &&
        (q === '' ||
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.facultyName.toLowerCase().includes(q)),
    )
    return sort === 'Most Credits'
      ? [...matched].sort((a, b) => b.creditReward - a.creditReward)
      : matched
  }, [problems, query, department, savedOnly, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Any filter change collapses the result set — return to the first page.
  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  return (
    <div className="mx-auto w-full max-w-container-max px-md py-lg md:px-lg lg:px-xl">
      {/* Header + stats */}
      <div className="mb-lg flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-headline-lg tracking-tight text-primary">Open Problems</h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            Browse verified campus challenges and contribute to meaningful projects.
          </p>
        </div>
        <div className="flex gap-8 border-l border-outline-variant/30 pl-8">
          <Stat value={stats.problems} label="Problems" />
          <Stat value={stats.departments} label="Departments" />
          <Stat value={stats.teams} label="Teams" />
        </div>
      </div>

      {/* Search + discovery */}
      <div className="mb-lg flex flex-col gap-6">
        <div className="group relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-secondary"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            aria-label="Search problems"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search problems, departments, faculty..."
            className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-12 pr-4 text-body-lg outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Chip active={department === ''} onClick={() => resetPage(setDepartment)('')}>
              All Problems
            </Chip>
            {departments.map((dept) => (
              <Chip key={dept} active={department === dept} onClick={() => resetPage(setDepartment)(dept)}>
                {dept}
              </Chip>
            ))}
            <Chip active={savedOnly} onClick={() => resetPage(setSavedOnly)(!savedOnly)}>
              Saved
            </Chip>
          </div>

          <div className="relative inline-block">
            <select
              aria-label="Sort problems"
              value={sort}
              onChange={(e) => resetPage(setSort)(e.target.value as Sort)}
              className="appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-1.5 pr-10 text-label-md font-medium outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span
              className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline"
              aria-hidden="true"
            >
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Couldn’t load problems"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No problems match your filters"
          description="Try clearing a filter or searching differently."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            {pageItems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="mt-xl flex items-center justify-center gap-2" aria-label="Pagination">
              <PageBtn onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} icon="chevron_left" label="Previous" />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={
                    n === currentPage
                      ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-body-md font-medium text-on-primary'
                      : 'flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-body-md font-medium transition-colors hover:bg-surface-container'
                  }
                >
                  {n}
                </button>
              ))}
              <PageBtn onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} icon="chevron_right" label="Next" />
            </nav>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-headline-sm text-primary">{value}</p>
      <p className="text-label-md text-on-surface-variant">{label}</p>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-secondary px-4 py-1.5 text-label-md font-medium text-on-secondary'
          : 'rounded-full bg-surface-container-high px-4 py-1.5 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-highest'
      }
    >
      {children}
    </button>
  )
}

function PageBtn({ onClick, disabled, icon, label }: { onClick: () => void; disabled: boolean; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-outline-variant p-2 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}
