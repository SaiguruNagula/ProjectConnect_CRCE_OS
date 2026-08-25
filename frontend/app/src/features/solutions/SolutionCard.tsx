/**
 * App-store style card for a campus solution: icon, status, tags, meta + CTA.
 * Links back to the project and problem it came from, so a solution is never a
 * dead end in the Problem → Project → Solution chain.
 */
import { Link } from 'react-router-dom'
import type { Solution } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { SolutionStatusBadge } from '@/features/solutions/SolutionStatusBadge'

export function SolutionCard({ solution }: { solution: Solution }) {
  const ctaClass =
    'rounded-lg bg-secondary px-md py-xs font-label-md text-on-secondary transition-colors hover:bg-on-secondary-fixed-variant'
  return (
    <div className="group flex items-start gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-md transition-all hover:border-secondary">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low transition-colors group-hover:bg-secondary/5">
        <span className="material-symbols-outlined text-3xl text-secondary" aria-hidden="true">
          {solution.icon}
        </span>
      </div>
      <div className="min-w-0 flex-grow">
        <div className="mb-xs flex items-center justify-between gap-xs">
          <h4 className="truncate text-headline-sm">{solution.name}</h4>
          {solution.status && <SolutionStatusBadge status={solution.status} />}
        </div>
        <p className="mb-sm line-clamp-2 text-body-md text-on-surface-variant">{solution.description}</p>
        <div className="mb-sm flex flex-wrap gap-xs">
          {solution.tags.map((t) => (
            <span key={t} className="rounded bg-primary/5 px-xs py-[2px] text-[10px] font-medium text-primary-container">
              {t}
            </span>
          ))}
        </div>
        {(solution.projectId || solution.problemId) && (
          <p className="mb-sm flex flex-wrap items-center gap-xs text-[11px] text-on-surface-variant">
            <span>Built from</span>
            {solution.projectId && (
              <Link
                to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: solution.projectId })}
                className="font-medium text-secondary hover:underline"
              >
                the project
              </Link>
            )}
            {solution.projectId && solution.problemId && <span aria-hidden="true">·</span>}
            {solution.problemId && (
              <Link
                to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: solution.problemId })}
                className="font-medium text-secondary hover:underline"
              >
                the problem
              </Link>
            )}
          </p>
        )}
        <div className="mt-md flex items-center justify-between border-t border-outline-variant/20 pt-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
              {solution.metaLabel}
            </span>
            <span className="font-mono text-label-md">{solution.metaValue}</span>
          </div>
          {solution.url ? (
            <a href={solution.url} target="_blank" rel="noreferrer" className={ctaClass}>
              {solution.ctaLabel}
            </a>
          ) : (
            <Link
              to={
                solution.projectId
                  ? buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: solution.projectId })
                  : solution.problemId
                    ? buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: solution.problemId })
                    : ROUTES.SHARED.INNOVATION_HUB
              }
              className={ctaClass}
            >
              {solution.ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
