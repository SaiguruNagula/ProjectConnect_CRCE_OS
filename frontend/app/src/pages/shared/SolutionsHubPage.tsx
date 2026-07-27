/**
 * Solutions Hub — pixel-ported from the Stitch "Campus Solutions / Unified App
 * Marketplace". App-store discovery of deployed campus solutions: impact hero,
 * Faculty Highlights rail, category filters and a solution grid.
 *
 * Data (catalog + aggregate stats) comes from solutionsService; the page only
 * displays and filters it. Reuses SolutionCard / SolutionStatusBadge.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { solutionsService } from '@/services/catalog.service'
import type { Solution, SolutionStats } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { SolutionCard } from '@/features/solutions/SolutionCard'
import { SolutionStatusBadge } from '@/features/solutions/SolutionStatusBadge'

export function SolutionsHubPage() {
  const { data, loading, error } = useAsync<Solution[]>(() => solutionsService.list())
  const { data: stats } = useAsync<SolutionStats>(() => solutionsService.stats())
  const [category, setCategory] = useState('')

  const solutions = useMemo(() => data ?? [], [data])
  const featured = useMemo(() => solutions.filter((s) => s.featured), [solutions])
  const categories = useMemo(
    () => Array.from(new Set(solutions.map((s) => s.category))).sort(),
    [solutions],
  )
  const listed = useMemo(
    () => solutions.filter((s) => category === '' || s.category === category),
    [solutions, category],
  )

  return (
    <div className="mx-auto w-full max-w-container-max px-gutter pb-xl">
      {/* Hero */}
      <section className="flex flex-col items-center py-lg text-center">
        <div className="mb-md flex w-full items-center justify-between">
          <span className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-headline-md text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">apps</span>
            <span className="text-headline-sm font-semibold">Campus Solutions</span>
          </span>
          <Button>Submit Idea</Button>
        </div>
        <div className="max-w-4xl">
          <h1 className="mb-sm text-display text-on-surface">Building a Smarter CRCE</h1>
          <p className="mb-lg text-body-lg text-on-surface-variant">
            Student innovations improving campus life through engineering precision and shared intelligence.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-md rounded-2xl border border-outline-variant/50 bg-surface-container-low p-md md:grid-cols-4">
          <StatCell value={stats ? String(stats.liveSolutions) : '—'} label="Live Solutions" />
          <StatCell value={stats?.contributors ?? '—'} label="Contributors" divider />
          <StatCell value={stats ? String(stats.departments) : '—'} label="Departments" divider />
          <StatCell value={stats?.campusUsers ?? '—'} label="Campus Users" divider />
        </div>
      </section>

      {/* Faculty highlights */}
      {featured.length > 0 && (
        <section className="pb-xl">
          <h2 className="mb-md text-headline-md">Faculty Highlights</h2>
          <div className="no-scrollbar -mx-gutter flex snap-x gap-md overflow-x-auto px-gutter">
            {featured.map((s) => (
              <FeaturedCard key={s.id} solution={s} />
            ))}
          </div>
        </section>
      )}

      {/* Category filters */}
      <section className="no-scrollbar -mx-gutter mb-md flex items-center gap-xs overflow-x-auto px-gutter py-md">
        <Chip active={category === ''} onClick={() => setCategory('')}>All</Chip>
        {categories.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </section>

      {/* Solution grid */}
      <section className="pb-xl">
        {loading ? (
          <PageLoader />
        ) : error ? (
          <EmptyState icon="error" title="Solutions unavailable" description={error} />
        ) : listed.length === 0 ? (
          <EmptyState icon="apps" title="No solutions in this category" description="Try a different filter." />
        ) : (
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            {listed.map((s) => (
              <SolutionCard key={s.id} solution={s} />
            ))}
          </div>
        )}
      </section>

      {/* Footer meta */}
      <footer className="border-t border-outline-variant/30 py-xl text-center">
        <div className="flex flex-col items-center gap-xs">
          <span className="text-label-md font-black tracking-tighter text-on-surface">CRCE OS / SOLUTIONS</span>
          <p className="text-body-md text-on-surface-variant">© 2026 College of Engineering Innovation Ecosystem.</p>
          <div className="mt-sm flex gap-md">
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-secondary">Impact Report</a>
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-secondary">Privacy Policy</a>
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-secondary">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCell({ value, label, divider = false }: { value: string; label: string; divider?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${divider ? 'border-outline-variant/30 md:border-l' : ''}`}>
      <span className="text-headline-lg text-secondary">{value}</span>
      <span className="text-label-md uppercase text-on-surface-variant">{label}</span>
    </div>
  )
}

function FeaturedCard({ solution }: { solution: Solution }) {
  return (
    <div className="w-[85vw] flex-none snap-center md:w-[450px]">
      <div className="group relative h-64 overflow-hidden rounded-2xl border border-outline-variant/50 bg-gradient-to-br from-primary-container to-inverse-surface">
        <span className="pointer-events-none absolute -right-6 -top-6 transition-transform duration-700 group-hover:scale-110" aria-hidden="true">
          <span className="material-symbols-outlined text-[160px] text-white/10" style={{ fontVariationSettings: "'FILL' 1" }}>{solution.icon}</span>
        </span>
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-lg">
          <div className="mb-xs flex items-center gap-xs">
            <SolutionStatusBadge status={solution.status} variant="solid" />
            {solution.highlightTag && (
              <span className="rounded bg-white/20 px-xs py-[2px] text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                {solution.highlightTag}
              </span>
            )}
          </div>
          <h3 className="mb-xs text-headline-md text-white">{solution.name}</h3>
          <p className="line-clamp-1 text-body-md text-white/80">{solution.description}</p>
        </div>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'whitespace-nowrap rounded-full bg-secondary px-sm py-xs font-label-md text-on-secondary'
          : 'whitespace-nowrap rounded-full bg-surface-container-low px-sm py-xs font-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high'
      }
    >
      {children}
    </button>
  )
}
