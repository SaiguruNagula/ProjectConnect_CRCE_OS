/**
 * Institution Analytics — the principal's institutional performance workspace.
 * Faithful migration of the approved Stitch prototype
 * (frontend/crce_os_institution_analytics_production_master_console): innovation
 * health hero, four headline KPIs, department performance table, approvals rail
 * and the two quick controls (broadcast + report generation).
 *
 * Reads the SAME analytics aggregate as the Principal Dashboard through
 * useInstitutionAnalytics() — one hook, one service, one endpoint, no second
 * analytics source and no metric recomputed in the UI. The view is read-only:
 * users, institutions, credits, leaderboard scores, projects and reviews cannot
 * be modified from here. App chrome (sidebar, top bar, mobile nav) is owned by
 * PrincipalLayout / RoleLayout and is intentionally not reproduced.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstitutionAnalytics } from '@/hooks/useInstitutionAnalytics'
import type { InstitutionAnalytics, ReportOption } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

/** Stitch's `.linear-shadow` utility, ported verbatim. */
const LINEAR_SHADOW = 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]'
const CARD = `rounded-xl border border-outline-variant/30 bg-surface-container-lowest ${LINEAR_SHADOW}`

/** Close on Escape — same dialog behaviour as Admin Institutions. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

/**
 * Report generation drawer. Category and format are local presentation state;
 * the download itself is not wired — there is no reporting endpoint yet and
 * analytics stays read-only.
 */
function ReportsDrawer({
  categories,
  formats,
  onClose,
}: {
  categories: ReportOption[]
  formats: ReportOption[]
  onClose: () => void
}) {
  useEscape(onClose)
  const [category, setCategory] = useState(categories[0]?.id ?? '')
  const [format, setFormat] = useState(formats[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-inverse-surface/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Generate reports"
        className="absolute inset-y-0 right-0 flex w-full max-w-[320px] flex-col border-l border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-md">
          <h2 className="text-headline-sm">Generate Reports</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reports drawer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-container"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-md overflow-y-auto p-md">
          <fieldset>
            <legend className="mb-xs text-label-md uppercase text-outline">Category</legend>
            <div className="grid gap-xs">
              {categories.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={category === option.id}
                  onClick={() => setCategory(option.id)}
                  className={`flex items-center gap-xs rounded-lg border p-sm text-left text-body-md transition-colors ${
                    category === option.id
                      ? 'border-secondary text-secondary'
                      : 'border-outline-variant hover:border-secondary hover:text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-xs text-label-md uppercase text-outline">Format</legend>
            <div className="flex gap-xs">
              {formats.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={format === option.id}
                  onClick={() => setFormat(option.id)}
                  className={`flex-1 rounded-lg border p-sm font-medium transition-colors ${
                    format === option.id
                      ? 'border-secondary bg-surface-container text-secondary'
                      : 'border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="border-t border-outline-variant/20 p-md">
          {/* ponytail: export needs a reporting endpoint; no client-side PDF generator. */}
          <button
            type="button"
            className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:opacity-90"
          >
            Download Report
          </button>
        </div>
      </aside>
    </div>
  )
}

/**
 * Broadcast composer — the one action the approved design grants the principal
 * here. Sending is not wired: announcements have no service yet, and nothing in
 * the analytics aggregate is touched.
 */
function BroadcastModal({ onClose }: { onClose: () => void }) {
  useEscape(onClose)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('All Institution')
  const field = 'w-full rounded-lg border-outline-variant text-body-md focus:border-secondary focus:ring-secondary'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-gutter">
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="broadcast-title"
        className="relative w-full max-w-lg rounded-xl bg-surface-container-lowest p-lg shadow-2xl"
      >
        <div className="mb-md flex items-center justify-between">
          <h2 id="broadcast-title" className="text-headline-md">New Broadcast Announcement</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close broadcast composer"
            className="text-outline hover:text-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="space-y-sm">
          <div>
            <label htmlFor="broadcast-heading" className="mb-xs block text-label-md text-outline">
              Announcement Title
            </label>
            <input
              id="broadcast-heading"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className={field}
            />
          </div>
          <div>
            <label htmlFor="broadcast-message" className="mb-xs block text-label-md text-outline">
              Message Content
            </label>
            <textarea
              id="broadcast-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className={field}
            />
          </div>
          <div>
            <label htmlFor="broadcast-audience" className="mb-xs block text-label-md text-outline">
              Target Audience
            </label>
            <select
              id="broadcast-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className={field}
            >
              <option>All Institution</option>
              <option>Faculty Only</option>
              <option>Students Only</option>
              <option>Specific Department</option>
            </select>
          </div>
        </div>

        <div className="mt-lg flex gap-sm">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-outline-variant py-3 font-semibold hover:bg-surface-container"
          >
            Cancel
          </button>
          {/* ponytail: no announcements domain yet; wire to POST /announcements when it lands. */}
          <button
            type="button"
            className="flex-1 rounded-lg bg-secondary py-3 font-semibold text-on-secondary hover:opacity-90"
          >
            Send Broadcast
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalyticsView({ analytics }: { analytics: InstitutionAnalytics }) {
  const [reportsOpen, setReportsOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  return (
    <>
      <h1 className="sr-only">Institution Analytics — {analytics.institutionName}</h1>

      {/* Innovation health + headline KPIs */}
      <div className="mb-lg grid gap-md lg:grid-cols-12">
        <section
          aria-labelledby="innovation-health"
          className={`relative flex flex-col justify-between overflow-hidden p-lg lg:col-span-4 ${CARD}`}
        >
          <span className="pointer-events-none absolute right-0 top-0 p-md opacity-10" aria-hidden="true">
            <span className="material-symbols-outlined text-8xl">insights</span>
          </span>
          <div>
            <h2 id="innovation-health" className="mb-xs text-label-md uppercase tracking-wider text-outline">
              Innovation Health
            </h2>
            <p className="mb-sm font-display text-[40px] leading-tight">{analytics.health.status}</p>
          </div>
          <p className="flex flex-wrap items-center gap-xs">
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-sm py-1 text-[#065F46]">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">trending_up</span>
              <span className="font-mono text-label-md">{analytics.health.change}</span>
            </span>
            <span className="text-body-md text-outline">{analytics.health.caption}</span>
          </p>
        </section>

        <section aria-label="Institution totals" className="grid grid-cols-2 gap-sm md:grid-cols-4 lg:col-span-8">
          {analytics.summary.map((metric) => (
            <div key={metric.id} className={`flex flex-col justify-center p-md ${CARD}`}>
              <span className="material-symbols-outlined mb-xs text-secondary" aria-hidden="true">
                {metric.icon}
              </span>
              <p className="text-label-md text-outline">{metric.label}</p>
              <p className="mt-1 text-headline-lg tracking-tight">{metric.value}</p>
            </div>
          ))}
        </section>
      </div>

      <div className="grid gap-lg lg:grid-cols-3">
        {/* Department performance */}
        <section aria-labelledby="department-performance" className="lg:col-span-2">
          <div className="mb-sm flex items-center justify-between">
            <h2 id="department-performance" className="text-headline-md">Department Performance</h2>
            <Link
              to={ROUTES.SHARED.LEADERBOARD}
              className="group flex items-center gap-xs text-body-md text-secondary"
            >
              Full Leaderboard
              <span
                className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={`overflow-x-auto ${CARD}`}>
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">
                Active projects, completion rate and health status by department.
              </caption>
              <thead className="border-b border-outline-variant/20 bg-surface-container-low">
                <tr>
                  <th scope="col" className="px-md py-sm text-label-md uppercase text-outline">Dept Name</th>
                  <th scope="col" className="px-md py-sm text-label-md uppercase text-outline">Active Projects</th>
                  <th scope="col" className="px-md py-sm text-label-md uppercase text-outline">Completion %</th>
                  <th scope="col" className="px-md py-sm text-label-md uppercase text-outline">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {analytics.departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-xl text-center text-outline">No department data found.</td>
                  </tr>
                ) : (
                  analytics.departments.map((dept) => (
                    <tr key={dept.id} className="group transition-colors hover:bg-surface-container-low/40">
                      <th
                        scope="row"
                        className="px-md py-md text-left text-body-md font-medium transition-colors group-hover:text-secondary"
                      >
                        {dept.name}
                      </th>
                      <td className="px-md py-md font-mono text-body-md">{dept.activeProjects}</td>
                      <td className="px-md py-md">
                        <div className="flex items-center gap-xs">
                          <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
                            <span className="block h-full bg-secondary" style={{ width: `${dept.completionRate}%` }} />
                          </span>
                          <span className="font-mono text-label-md">{dept.completionRate}%</span>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <span
                          role="img"
                          aria-label={dept.healthy ? 'On track' : 'Needs attention'}
                          className={`block h-3 w-3 rounded-full ${
                            dept.healthy
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                          }`}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Approvals */}
        <section aria-labelledby="approvals">
          <div className="mb-sm flex items-center justify-between">
            <h2 id="approvals" className="text-headline-md">Approvals</h2>
            <span className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-error-container">
              {analytics.newApprovalsCount} New
            </span>
          </div>
          {analytics.approvals.length === 0 ? (
            <EmptyState icon="task_alt" title="Nothing awaiting approval" />
          ) : (
            <ul className="space-y-sm">
              {analytics.approvals.map((approval) => (
                <li key={approval.id} className={`p-md ${CARD}`}>
                  <div className="mb-xs flex items-start justify-between gap-xs">
                    <h3 className="flex items-center gap-xs text-body-md font-semibold">
                      <span className="material-symbols-outlined" aria-hidden="true">{approval.icon}</span>
                      {approval.title}
                    </h3>
                    <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant">
                      {approval.priority}
                    </span>
                  </div>
                  <div className="mb-sm space-y-1 px-7">
                    <p className="text-label-md text-outline">Submitted by: {approval.submittedBy}</p>
                    <p className="text-[11px] text-outline/60">Date: {approval.date}</p>
                  </div>
                  {/* ponytail: approvals queue has no route yet; button stays inert until it exists. */}
                  <button
                    type="button"
                    className="w-full rounded-lg bg-primary py-2 text-body-md text-on-primary transition-transform hover:opacity-90 active:scale-95"
                  >
                    Review<span className="sr-only"> {approval.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick controls */}
      <div className="mt-lg grid gap-md md:grid-cols-2">
        <button
          type="button"
          onClick={() => setBroadcastOpen(true)}
          className="group flex items-center justify-between gap-md rounded-xl bg-secondary-container p-lg text-left transition-opacity hover:opacity-95"
        >
          <span className="flex items-center gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <span className="material-symbols-outlined text-white" aria-hidden="true">campaign</span>
            </span>
            <span>
              <span className="block text-headline-sm text-white">Broadcast Banner</span>
              <span className="block text-body-md text-white/70">
                Push announcements to all students and faculty.
              </span>
            </span>
          </span>
          <span
            className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            chevron_right
          </span>
        </button>

        <button
          type="button"
          onClick={() => setReportsOpen(true)}
          className="group flex items-center justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-left transition-colors hover:bg-surface-container-low"
        >
          <span className="flex items-center gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container">
              <span className="material-symbols-outlined" aria-hidden="true">download</span>
            </span>
            <span>
              <span className="block text-headline-sm">Institution Report</span>
              <span className="block text-body-md text-outline">
                Export 2023-24 comprehensive analytics (PDF).
              </span>
            </span>
          </span>
          <span
            className="material-symbols-outlined transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            chevron_right
          </span>
        </button>
      </div>

      {reportsOpen && (
        <ReportsDrawer
          categories={analytics.reportCategories}
          formats={analytics.reportFormats}
          onClose={() => setReportsOpen(false)}
        />
      )}
      {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} />}
    </>
  )
}

export function PrincipalAnalyticsPage() {
  const { analytics, loading, error, reload } = useInstitutionAnalytics()

  if (loading) return <PageLoader />
  if (error || !analytics) {
    return (
      <EmptyState
        icon="analytics"
        title="Analytics unavailable"
        description={error ?? 'Institution analytics could not be loaded.'}
        action={
          <button
            type="button"
            onClick={reload}
            className="rounded-lg bg-primary px-md py-sm font-medium text-on-primary hover:opacity-90"
          >
            Try again
          </button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-container-max pb-lg">
      <AnalyticsView analytics={analytics} />
    </div>
  )
}
