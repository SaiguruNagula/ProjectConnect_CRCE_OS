/**
 * Principal Dashboard — the executive institutional command center. Faithful
 * migration of the Stitch "Executive Command Center" prototype
 * (frontend/crce_os_principal_executive_command_center_production_refined):
 * institution snapshot, innovation snapshot, embedded leaderboards, department
 * health, institution decisions and the analytics rail (growth chart +
 * department comparison radar).
 *
 * Read-only and executive by design: no user or institution management surfaces
 * here — those stay in the Admin console. Every figure arrives through
 * usePrincipalDashboard() (the shared institution analytics aggregate +
 * leaderboardService); nothing is computed or hardcoded in this file. App chrome (sidebar, top bar, mobile nav)
 * is owned by PrincipalLayout / RoleLayout and is intentionally not reproduced.
 * Stitch's Chart.js canvases are drawn as inline SVG — the app ships no chart
 * dependency, matching how the other dashboards render their visuals.
 */
import { Link } from 'react-router-dom'
import { usePrincipalDashboard } from '@/hooks/usePrincipalDashboard'
import type {
  GrowthPoint,
  InstitutionMetric,
  LeaderboardEntry,
  MetricTone,
  NameValue,
} from '@/types/domain'
import { ROUTES, buildPath } from '@/constants/routes'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const TONE_TEXT: Record<MetricTone, string> = {
  muted: 'text-outline',
  brand: 'text-secondary',
  positive: 'text-green-600',
  critical: 'text-on-error-container',
}

const CARD = 'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm'
const HOVER_CARD = 'transition-all duration-200 hover:-translate-y-0.5 hover:border-outline hover:shadow-lg'
const SECTION_LABEL = 'mb-md text-label-md font-bold uppercase tracking-wider text-outline'

/** A snapshot tile: value, optional delta chip, meter, participant stack or footnote. */
function MetricTile({ metric, className }: { metric: InstitutionMetric; className: string }) {
  return (
    <div className={`rounded-xl border p-md ${HOVER_CARD} ${className}`}>
      <p className="mb-xs text-[10px] uppercase tracking-wider text-outline">{metric.label}</p>
      <div className="flex items-baseline gap-xs">
        <h3 className="text-headline-sm font-bold text-primary">{metric.value}</h3>
        {metric.badge && (
          <span className={`text-[10px] font-bold ${TONE_TEXT[metric.badgeTone ?? 'muted']}`}>
            {metric.badge}
          </span>
        )}
      </div>
      {metric.fill != null && (
        <div className="mt-sm h-1 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className={`h-full ${metric.fillTone === 'positive' ? 'bg-green-500' : 'bg-secondary'}`}
            style={{ width: `${metric.fill}%` }}
          />
        </div>
      )}
      {metric.participants != null && (
        <div className="mt-sm flex -space-x-1.5" aria-hidden="true">
          {Array.from({ length: metric.participants }, (_, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full border border-surface"
              style={{ backgroundColor: ['#e2e8f0', '#cbd5e1', '#94a3b8'][i % 3] }}
            />
          ))}
        </div>
      )}
      {metric.note &&
        (metric.noteTone === 'critical' ? (
          <p className="mt-sm inline-block rounded-full bg-error-container/30 px-xs text-[10px] text-on-error-container">
            {metric.note}
          </p>
        ) : (
          <p
            className={`mt-sm text-[10px] ${TONE_TEXT[metric.noteTone ?? 'muted']} ${
              metric.monoNote ? 'font-mono' : ''
            } ${metric.noteTone === 'brand' ? 'font-bold' : ''}`}
          >
            {metric.note}
          </p>
        ))}
    </div>
  )
}

/** Embedded leaderboard panel — top contributors, read from the Leaderboard. */
function LeaderPanel({
  id,
  title,
  entries,
  showRank,
  avatarClass,
}: {
  id: string
  title: string
  entries: LeaderboardEntry[]
  showRank: boolean
  avatarClass: string
}) {
  return (
    <section className={`${CARD} overflow-hidden`} aria-labelledby={id}>
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low/20 p-md">
        <h2 id={id} className="text-headline-sm text-primary">{title}</h2>
        <Link
          to={ROUTES.SHARED.LEADERBOARD}
          className="text-label-md font-bold text-secondary hover:underline"
        >
          VIEW FULL LEADERBOARD
        </Link>
      </div>
      <ul className="divide-y divide-outline-variant">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: entry.id })}
              className="flex items-center justify-between p-md transition-colors hover:bg-surface-container-low"
            >
              <span className="flex items-center gap-md">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center text-[10px] font-bold ${avatarClass}`}
                  aria-hidden="true"
                >
                  {entry.avatarInitials}
                </span>
                <span>
                  <span className="block font-semibold text-primary">{entry.name}</span>
                  <span className="block text-[10px] uppercase text-outline">
                    {entry.department}
                    {showRank && ` • Rank #${entry.rank}`}
                  </span>
                </span>
              </span>
              <span className="font-mono font-bold text-secondary">
                {entry.credits.toLocaleString()} Cr
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Institutional throughput: credit bars with the project count overlaid as a
 * line. Each series is scaled to its own maximum so both stay readable.
 */
function GrowthChart({ points }: { points: GrowthPoint[] }) {
  const maxCredits = Math.max(...points.map((p) => p.credits), 1)
  const maxProjects = Math.max(...points.map((p) => p.projects), 1)
  const line = points
    .map((p, i) => {
      const x = ((i + 0.5) / points.length) * 100
      const y = 100 - (p.projects / maxProjects) * 85
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div
      className="relative h-64"
      role="img"
      aria-label={`Credits and projects by month: ${points
        .map((p) => `${p.month}, ${p.credits.toLocaleString()} credits, ${p.projects} projects`)
        .join('; ')}`}
    >
      <div className="flex h-[calc(100%-1.5rem)] items-end gap-md">
        {points.map((point) => (
          <div key={point.month} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded border-2 border-secondary-container bg-secondary-container/20"
              style={{ height: `${(point.credits / maxCredits) * 90}%` }}
            />
          </div>
        ))}
      </div>
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%-1.5rem)] w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={line}
          fill="none"
          stroke="#131b2e"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-xs flex gap-md">
        {points.map((point) => (
          <span key={point.month} className="flex-1 text-center text-[10px] font-bold text-outline">
            {point.month}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Department comparison radar (values 0–100, one axis per dimension). */
function RadarChart({ axes }: { axes: NameValue[] }) {
  const center = 100
  const radius = 72
  const vertex = (index: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2
    const r = (value / 100) * radius
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }
  const toPoints = (pairs: [number, number][]) =>
    pairs.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const outer = axes.map((_, i) => vertex(i, 100))
  const shape = axes.map((axis, i) => vertex(i, axis.value))

  return (
    <div
      className="relative flex h-[280px] w-full items-center justify-center rounded-xl bg-surface-container-low/30"
      role="img"
      aria-label={`Department comparison: ${axes.map((a) => `${a.label} ${a.value}%`).join(', ')}`}
    >
      <svg viewBox="0 0 200 200" className="h-full w-full p-md" aria-hidden="true">
        <polygon points={toPoints(outer)} fill="none" stroke="#c6c6cd" strokeWidth="1" />
        {outer.map(([x, y], i) => (
          <line key={axes[i].label} x1={center} y1={center} x2={x} y2={y} stroke="#c6c6cd" strokeWidth="0.5" />
        ))}
        <polygon points={toPoints(shape)} fill="rgba(100, 94, 251, 0.2)" stroke="#645efb" strokeWidth="2" />
        {shape.map(([x, y], i) => (
          <circle key={axes[i].label} cx={x} cy={y} r="2.5" fill="#645efb" />
        ))}
      </svg>
    </div>
  )
}

export function PrincipalDashboard() {
  const { analytics, topStudents, topFaculty, loading, error } = usePrincipalDashboard()

  if (loading) return <PageLoader />
  if (error || !analytics) {
    return (
      <EmptyState
        icon="analytics"
        title="Analytics unavailable"
        description={error ?? 'Institution analytics could not be loaded.'}
      />
    )
  }

  return (
    <div className="mx-auto max-w-container-max">
      {/* Header */}
      <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div>
          <p className="mb-xs flex items-center gap-xs text-[10px] font-semibold uppercase tracking-widest text-secondary">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
            Institutional Integrity
          </p>
          <h1 className="mb-xs font-display text-headline-lg text-primary">{analytics.institutionName}</h1>
          <p className="text-body-lg text-on-surface-variant">{analytics.period}</p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface px-md py-sm font-medium text-primary transition-all hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">file_download</span>
            Export Report
          </button>
          <button
            type="button"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm font-medium text-on-primary shadow-sm transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">bolt</span>
            Quick Actions
          </button>
        </div>
      </div>

      {/* Institution snapshot */}
      <section aria-labelledby="institution-snapshot">
        <h2 id="institution-snapshot" className={SECTION_LABEL}>Institution Snapshot</h2>
        <div className="mb-xl grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
          {analytics.snapshot.map((metric) => (
            <MetricTile
              key={metric.id}
              metric={metric}
              className="border-outline-variant bg-surface-container-lowest"
            />
          ))}
        </div>
      </section>

      {/* Innovation snapshot */}
      <section aria-labelledby="innovation-snapshot">
        <h2 id="innovation-snapshot" className={SECTION_LABEL}>Innovation Snapshot</h2>
        <div className="mb-xl grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
          {analytics.innovation.map((metric) => (
            <MetricTile key={metric.id} metric={metric} className="border-outline-variant/50 bg-surface" />
          ))}
        </div>
      </section>

      {/* Embedded leaderboards */}
      <div className="mb-xl grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <LeaderPanel
          id="top-students"
          title="Top Students"
          entries={topStudents}
          showRank
          avatarClass="rounded bg-primary/5 text-primary"
        />
        <LeaderPanel
          id="top-faculty"
          title="Top Faculty"
          entries={topFaculty}
          showRank={false}
          avatarClass="rounded-full bg-secondary/10 text-secondary"
        />
      </div>

      {/* Department health */}
      <section className="mb-xl" aria-labelledby="department-health">
        <h2 id="department-health" className={SECTION_LABEL}>Department Health</h2>
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-body-md">
            <caption className="sr-only">
              Active projects, credits earned, success rate and pending reviews by department
            </caption>
            <thead className="bg-surface-container-low/50 text-[11px] uppercase tracking-wider text-outline">
              <tr>
                <th scope="col" className="p-md font-medium">Department</th>
                <th scope="col" className="p-md font-medium">Active Projects</th>
                <th scope="col" className="p-md font-medium">Credits Earned</th>
                <th scope="col" className="p-md font-medium">Success Rate</th>
                <th scope="col" className="p-md text-right font-medium">Pending Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {analytics.departments.map((dept) => (
                <tr key={dept.id} className="transition-colors hover:bg-surface-container-low">
                  <th scope="row" className="p-md text-left font-semibold text-primary">{dept.name}</th>
                  <td className="p-md">{dept.activeProjects}</td>
                  <td className="p-md font-mono">{dept.credits}</td>
                  <td className="p-md">
                    <span className="sr-only">{dept.successRate}%</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
                      <div className="h-full bg-secondary" style={{ width: `${dept.successRate}%` }} />
                    </div>
                  </td>
                  <td className={`p-md text-right font-bold ${dept.pendingReviewsCritical ? 'text-error' : ''}`}>
                    {dept.pendingReviews}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Institution decisions */}
      <section className="mb-xl" aria-labelledby="institution-decisions">
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low/30 p-md">
            <h2 id="institution-decisions" className="flex items-center gap-xs text-headline-sm text-primary">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">gavel</span>
              Institution Decisions
            </h2>
            <span className="rounded bg-error px-xs py-0.5 text-[10px] font-bold text-on-error">
              {analytics.decisionCount} ITEMS
            </span>
          </div>
          <div className="grid grid-cols-1 divide-x divide-y divide-outline-variant md:grid-cols-2 lg:grid-cols-3">
            {analytics.decisions.map((decision, index) => (
              <article
                key={decision.id}
                className={`group flex flex-col p-md transition-colors hover:bg-surface-container-low ${
                  // Odd count: the last card fills the orphan cell of the 2-column layout (Stitch parity).
                  index === analytics.decisions.length - 1 && analytics.decisions.length % 2 === 1
                    ? 'md:col-span-2 lg:col-span-1'
                    : ''
                }`}
              >
                <div className={`mb-sm flex items-start justify-between ${decision.tone === 'critical' ? 'text-error' : ''}`}>
                  <h3 className={`text-body-md font-semibold ${decision.tone === 'critical' ? '' : 'text-primary'}`}>
                    {decision.title}
                  </h3>
                  <span
                    className={`material-symbols-outlined ${
                      decision.tone === 'critical' ? '' : 'text-outline group-hover:text-secondary'
                    }`}
                    aria-hidden="true"
                  >
                    {decision.icon}
                  </span>
                </div>
                <p className="mb-md text-label-md text-outline">{decision.detail}</p>
                <p
                  className={`mt-auto text-[10px] font-bold uppercase tracking-wider ${
                    decision.tone === 'critical' ? 'text-error' : 'text-secondary'
                  }`}
                >
                  {decision.cta}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="mb-xl grid grid-cols-12 gap-gutter" aria-labelledby="growth-analytics">
        <div className={`col-span-12 ${CARD} p-lg lg:col-span-8`}>
          <div className="mb-lg flex flex-col justify-between gap-sm sm:flex-row sm:items-start">
            <div>
              <h2 id="growth-analytics" className="font-display text-headline-md text-primary">
                Project Growth &amp; Credit Distribution
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Institutional throughput and department comparison
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <span className="flex items-center gap-xs">
                <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase text-outline">Credits</span>
              </span>
              <span className="flex items-center gap-xs">
                <span className="h-2 w-2 rounded-full bg-primary-container" aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase text-outline">Projects</span>
              </span>
            </div>
          </div>
          <GrowthChart points={analytics.growth} />
          <dl className="mt-lg grid grid-cols-2 gap-lg md:grid-cols-4">
            {analytics.highlights.map((highlight) => (
              <div key={highlight.label}>
                <dt className="mb-xs text-label-md uppercase tracking-wider text-outline">{highlight.label}</dt>
                <dd>
                  <span className="block text-body-lg font-bold text-primary">{highlight.value}</span>
                  <span className={`block text-[11px] ${TONE_TEXT[highlight.noteTone]}`}>{highlight.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={`col-span-12 ${CARD} p-lg lg:col-span-4`}>
          <h2 className="mb-md text-headline-sm text-primary">Dept. Comparison</h2>
          <RadarChart axes={analytics.departmentRadar} />
          <div className="mt-md space-y-xs">
            {analytics.departmentPerformance.map((dept) => (
              <div key={dept.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-on-surface-variant">{dept.label}</span>
                  <span className="font-bold text-secondary">{dept.value}%</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
                  <div className="h-full bg-secondary" style={{ width: `${dept.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
