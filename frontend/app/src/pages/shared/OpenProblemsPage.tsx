/**
 * Open Problems catalog — pixel-ported from the approved Stitch prototype.
 * Search + department chips + sort + pagination over service-provided data.
 * Every query decision (filter, sort, page) is owned by useOpenProblems; this
 * page renders the page it is handed and never slices an array itself.
 *
 * Students can also suggest a problem here — a suggestion goes to a mentor for
 * review and is never published directly from this screen.
 */
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOpenProblems, PROBLEMS_PER_PAGE } from '@/hooks/useOpenProblems'
import { useAuth } from '@/contexts/AuthContext'
import { QUERY_PARAMS } from '@/constants/routes'
import type { ProblemSort } from '@/types/domain'
import { ProblemCard } from '@/features/problems/ProblemCard'
import { SuggestProblemDialog } from '@/features/problems/SuggestProblemDialog'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'

const SORTS: { value: ProblemSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'credits', label: 'Most Credits' },
]

export function OpenProblemsPage() {
  const [searchParams] = useSearchParams()
  // Seeded from ?q= so a search started on the Innovation Hub carries over.
  const { query, setFilter, setPage, problems, departments, stats, page, totalPages, total, loading, error, reload } =
    useOpenProblems(searchParams.get(QUERY_PARAMS.SEARCH) ?? '')
  const [suggesting, setSuggesting] = useState(false)
  // Suggesting and saving are student actions end to end: only a student may
  // POST one, and only a student has a mentor to send it to. Showing them to
  // anyone else offers a form whose only possible answer is a 403.
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  const firstOnPage = (page - 1) * PROBLEMS_PER_PAGE + 1
  const lastOnPage = Math.min(page * PROBLEMS_PER_PAGE, total)

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
            value={query.search ?? ''}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search problems, departments, faculty..."
            className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-12 pr-4 text-body-lg outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Chip active={query.department === ''} onClick={() => setFilter('department', '')}>
              All Problems
            </Chip>
            {departments.map((dept) => (
              <Chip
                key={dept}
                active={query.department === dept}
                onClick={() => setFilter('department', dept)}
              >
                {dept}
              </Chip>
            ))}
            {/* Saving is a student action, so for anyone else this filter can
                only ever return nothing. */}
            {isStudent && (
              <Chip active={!!query.savedOnly} onClick={() => setFilter('savedOnly', !query.savedOnly)}>
                Saved
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-sm">
            <div className="relative inline-block">
              <select
                aria-label="Sort problems"
                value={query.sort}
                onChange={(e) => setFilter('sort', e.target.value as ProblemSort)}
                className="appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-1.5 pr-10 text-label-md font-medium outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
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

            {/* Secondary to browsing: suggesting is the exception, not the path. */}
            {isStudent && (
              <Button variant="outline" size="sm" onClick={() => setSuggesting(true)}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                Suggest a Problem
              </Button>
            )}
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
      ) : problems.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No problems match your filters"
          description="Try clearing a filter or searching differently."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            summary={`Showing ${firstOnPage}–${lastOnPage} of ${total} problems`}
          />
        </>
      )}

      <SuggestProblemDialog open={isStudent && suggesting} onClose={() => setSuggesting(false)} />
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
