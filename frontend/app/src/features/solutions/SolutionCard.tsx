/** App-store style card for a campus solution: icon, status, tags, meta + CTA. */
import type { Solution } from '@/types/domain'
import { SolutionStatusBadge } from '@/features/solutions/SolutionStatusBadge'

export function SolutionCard({ solution }: { solution: Solution }) {
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
          <SolutionStatusBadge status={solution.status} />
        </div>
        <p className="mb-sm line-clamp-2 text-body-md text-on-surface-variant">{solution.description}</p>
        <div className="mb-sm flex flex-wrap gap-xs">
          {solution.tags.map((t) => (
            <span key={t} className="rounded bg-primary/5 px-xs py-[2px] text-[10px] font-medium text-primary-container">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-md flex items-center justify-between border-t border-outline-variant/20 pt-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
              {solution.metaLabel}
            </span>
            <span className="font-mono text-label-md">{solution.metaValue}</span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-secondary px-md py-xs font-label-md text-on-secondary transition-colors hover:bg-on-secondary-fixed-variant"
          >
            {solution.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
