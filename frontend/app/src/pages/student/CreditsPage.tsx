/**
 * Credit Engine — ported from the approved Stitch "Credit Engine / Milestone
 * Tracker" design: total-credits hero with level progress, balance tiles,
 * category breakdown, activity timeline and the credit pipeline.
 *
 * The Credit Engine is the single source of truth (DECISIONS.md §10). Balances,
 * level and milestone progress are computed by the engine and served via
 * creditsService — this page only displays them (no business logic in the UI).
 */
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { creditsService } from '@/services/catalog.service'
import type {
  CreditCategory,
  CreditPipelineItem,
  CreditSummary,
  CreditTransaction,
} from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

/** Whole days ago for `date`, rendered as a friendly label. */
function daysAgo(date: string): string {
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.round(days / 7)} weeks ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CreditsPage() {
  const summary = useAsync<CreditSummary>(() => creditsService.summary())
  const categories = useAsync<CreditCategory[]>(() => creditsService.categories())
  const pipeline = useAsync<CreditPipelineItem[]>(() => creditsService.pipeline())
  const history = useAsync<CreditTransaction[]>(() => creditsService.history())

  if (summary.loading) return <PageLoader />
  if (summary.error || !summary.data) {
    return (
      <EmptyState
        icon="stars"
        title="Credits unavailable"
        description={summary.error ?? 'Your credit balance could not be loaded.'}
      />
    )
  }
  const s = summary.data

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg px-md py-lg md:px-lg">
      <h1 className="sr-only">Credit Engine</h1>
      {/* Hero */}
      <Card className="flex flex-col items-start justify-between gap-md bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-lg md:flex-row md:items-center">
        <div className="w-full flex-1">
          <span className="rounded-full bg-secondary/10 px-3 py-1 font-mono text-label-md uppercase text-secondary">
            Credit Engine {s.engineVersion}
          </span>
          <h2 className="mb-xs mt-xs text-display text-primary">Total Credits: {s.total}</h2>
          <p className="mb-md text-headline-sm text-on-surface-variant">
            Level {s.level}: {s.levelName}
          </p>
          <div className="w-full max-w-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-md font-bold text-secondary">
                {s.pctToNext}% to {s.nextLevelName}
              </span>
              <span className="text-label-md text-on-surface-variant">
                {s.creditsToNext} credits to next milestone ({s.nextMilestone})
              </span>
            </div>
            <ProgressBar value={s.pctToNext} className="h-3" />
          </div>
        </div>
        <div className="hidden h-32 w-32 items-center justify-center rounded-full bg-secondary-fixed md:flex">
          <span
            className="material-symbols-outlined text-5xl text-on-secondary-fixed-variant"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            stars
          </span>
        </div>
      </Card>

      {/* Balances + categories */}
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-lg lg:col-span-8">
          <StatTile label="Current" value={s.current} valueClass="text-secondary" />
          <StatTile label="Pending" value={s.pending} valueClass="text-[#D97706]" />
          <StatTile label="Locked" value={s.locked} valueClass="text-outline" />
          <StatTile label="Lifetime" value={s.lifetime} valueClass="text-primary" />
        </div>

        <Card className="lg:col-span-4">
          <h3 className="mb-md flex items-center gap-xs text-headline-sm">
            <span className="material-symbols-outlined" aria-hidden="true">category</span> Categories
          </h3>
          <div className="flex flex-col gap-sm">
            {categories.data?.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-lg bg-surface-container p-sm">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary" aria-hidden="true">{c.icon}</span>
                  <span className="text-label-md">{c.label}</span>
                </div>
                <span className="font-mono font-bold text-primary">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity + pipeline */}
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-md flex items-center justify-between">
            <h3 className="text-headline-sm">Recent Activity</h3>
            <Link to={ROUTES.STUDENT.PROJECTS} className="text-label-md text-secondary hover:underline">
              My Projects
            </Link>
          </div>
          {history.loading ? (
            <PageLoader />
          ) : history.error ? (
            <EmptyState icon="error" title="Couldn't load your ledger" description={history.error} />
          ) : history.data && history.data.length > 0 ? (
            <div className="relative flex flex-col">
              <div className="absolute bottom-4 left-6 top-4 w-px bg-outline-variant" aria-hidden="true" />
              {history.data.map((t, i) => (
                <ActivityItem key={t.id} transaction={t} first={i === 0} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="savings"
              title="No credits yet"
              description="Credits are awarded by faculty once your final project is approved."
            />
          )}
        </Card>

        <div className="flex flex-col gap-lg lg:col-span-5">
          <Card className="flex flex-col bg-secondary text-on-secondary">
            <h3 className="mb-md flex items-center gap-xs text-headline-sm">
              <span className="material-symbols-outlined" aria-hidden="true">pending_actions</span> Pipeline
            </h3>
            <div className="flex flex-col gap-sm">
              {pipeline.data?.map((p) => (
                <div key={p.id} className="rounded-lg border border-white/20 bg-white/10 p-sm">
                  <div className="mb-xs flex items-center justify-between gap-xs">
                    <span className="text-label-md font-bold text-secondary-fixed">{p.title}</span>
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] uppercase tracking-tight text-on-secondary-container">
                      {p.status}
                    </span>
                  </div>
                  <p className="mb-xs text-body-md text-white/90">{p.detail}</p>
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">insights</span>
                    <span className="font-mono text-sm font-bold">Potential: +{p.potential}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Credits cannot be claimed — faculty award them on final approval. */}
            <p className="mt-md flex items-center gap-xs text-label-md text-white/80">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
              Credits are awarded automatically once faculty approve your final submission.
            </p>
          </Card>
        </div>
      </div>

      {/* Footer meta — ponytail: System Status/Terms have no page yet; linking to
          the real destinations beats dead href="#" anchors. */}
      <div className="flex flex-col items-center justify-between gap-sm border-t border-outline-variant/30 pt-md font-mono text-mono text-on-surface-variant opacity-80 md:flex-row">
        <span>CRCE OS Credit Engine</span>
        <span className="flex items-center gap-md">
          <Link to={ROUTES.SHARED.LEADERBOARD} className="hover:text-primary">Leaderboard</Link>
          <Link to={ROUTES.PUBLIC.ABOUT} className="hover:text-primary">About CRCE OS</Link>
        </span>
      </div>
    </div>
  )
}

function StatTile({ label, value, valueClass }: { label: string; value: number; valueClass: string }) {
  return (
    <Card className="flex flex-col justify-between gap-sm">
      <span className="text-label-md uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className={`text-headline-lg font-bold ${valueClass}`}>{value}</span>
    </Card>
  )
}

function ActivityItem({ transaction: t, first }: { transaction: CreditTransaction; first: boolean }) {
  return (
    <div className="relative flex gap-md pb-md">
      <div
        className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-surface-container-lowest ${
          first ? 'border-secondary' : 'border-outline-variant'
        }`}
      >
        <span
          className={`material-symbols-outlined text-sm ${first ? 'text-secondary' : 'text-outline'}`}
          aria-hidden="true"
        >
          {first ? 'check' : 'history_edu'}
        </span>
      </div>
      <div className="flex-1 border-b border-outline-variant pb-md last:border-0">
        <div className="mb-1 flex items-start justify-between gap-sm">
          <h4 className="text-body-lg font-semibold text-primary">{t.description}</h4>
          <span className="whitespace-nowrap font-mono text-xs font-bold text-secondary">+{t.points} Credits</span>
        </div>
        <p className="text-body-md text-on-surface-variant">
          {t.source}
          {t.context ? ` • ${t.context}` : ''}
        </p>
        <span className="text-label-md text-outline">{daysAgo(t.date)}</span>
      </div>
    </div>
  )
}
