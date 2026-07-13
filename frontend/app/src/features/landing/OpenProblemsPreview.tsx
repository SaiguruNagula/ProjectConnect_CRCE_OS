/** Open Problems preview — three live problems via the service, Stitch card style. */
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type { Problem, Difficulty } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

const BADGE: Record<Difficulty, { label: string; cls: string }> = {
  Beginner: { label: 'Open', cls: 'bg-green-100 text-green-800' },
  Intermediate: { label: 'Active', cls: 'bg-blue-100 text-blue-800' },
  Advanced: { label: 'Complex', cls: 'bg-purple-100 text-purple-800' },
}

export function OpenProblemsPreview() {
  const { data, loading } = useAsync<Problem[]>(() => problemsService.list())
  const problems = (data ?? []).slice(0, 3)

  return (
    <section className="mx-auto max-w-container-max px-md py-xl">
      <div className="mb-lg flex items-end justify-between">
        <div>
          <h2 className="mb-xs font-headline-lg text-headline-lg">Open Problems</h2>
          <p className="text-on-surface-variant">Available challenges waiting for innovation.</p>
        </div>
        <Link to={ROUTES.SHARED.OPEN_PROBLEMS} className="hidden items-center gap-xs font-bold text-secondary md:flex">
          View All <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => {
            const badge = BADGE[p.difficulty]
            return (
              <div key={p.id} className="stripe-border group rounded-xl bg-white p-lg transition-shadow hover:shadow-md">
                <div className="mb-md flex items-start justify-between">
                  <span className={`rounded-full px-sm py-1 font-label-md text-label-md uppercase ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="font-mono text-label-md text-on-surface-variant">
                    ID: #{p.id.replace(/\D/g, '') || '000'}
                  </span>
                </div>
                <h4 className="mb-sm font-headline-sm text-headline-sm transition-colors group-hover:text-secondary">
                  {p.title}
                </h4>
                <p className="mb-md font-body-md text-on-surface-variant">{p.summary}</p>
                <div className="mb-lg flex flex-wrap gap-xs">
                  <span className="rounded bg-surface-container px-sm py-1 font-label-md text-label-md">{p.department}</span>
                  <span className="rounded bg-surface-container px-sm py-1 font-label-md text-label-md">{p.difficulty}</span>
                </div>
                <Link
                  to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: p.id })}
                  className="block w-full rounded-lg bg-primary py-sm text-center font-bold text-on-primary hover:opacity-90"
                >
                  Apply Now
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <Link
        to={ROUTES.SHARED.OPEN_PROBLEMS}
        className="mt-lg block w-full rounded-lg border border-outline-variant py-md text-center font-bold md:hidden"
      >
        View All Problems
      </Link>
    </section>
  )
}
