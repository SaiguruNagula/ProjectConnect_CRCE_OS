/**
 * Admin Dashboard — the institutional administration command center. Faithful
 * migration of the Stitch "Platform Snapshot" prototype
 * (frontend/projectconnect_admin_operational_master_control_refined): a header
 * with quick actions, a six-tile KPI grid, monthly adoption chart, operational
 * queue, moderation center, an Institution Management table, a right rail
 * (recent institution activity + platform health + system logs) and a formal
 * transaction-audit table.
 *
 * All data is read-only through the admin service (adminService.dashboard());
 * no metric is hardcoded in JSX and no business logic lives here. App chrome
 * (sidebar, top bar, mobile nav) is owned by AdminLayout / RoleLayout and is
 * intentionally not reproduced. Stitch's `success`/`warning` tokens map to
 * Tailwind emerald/amber (the app palette has no such tokens), matching how the
 * other role dashboards render status colors.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/catalog.service'
import type {
  AdminDashboardData,
  AdminInstitutionRow,
  AdminKpiTone,
  AuditEntry,
  ModerationStat,
  OperationalQueueItem,
  PlatformHealthMetric,
} from '@/types/domain'
import { downloadCsv } from '@/utils/csv'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const SNAPSHOT_COLUMNS: { header: string; value: (i: AdminInstitutionRow) => unknown }[] = [
  { header: 'Institution', value: (i) => i.name },
  { header: 'Location', value: (i) => i.location },
  { header: 'Principal', value: (i) => i.principal },
  { header: 'Students', value: (i) => i.students },
  { header: 'Faculty', value: (i) => i.faculty },
  { header: 'Projects', value: (i) => i.projects },
  { header: 'Status', value: (i) => i.status },
  { header: 'Participation', value: (i) => i.participation },
]

const AUDIT_COLUMNS: { header: string; value: (e: AuditEntry) => unknown }[] = [
  { header: 'Timestamp', value: (e) => e.timestamp },
  { header: 'Action', value: (e) => e.action },
  { header: 'Actor', value: (e) => e.actor },
  { header: 'Target', value: (e) => e.target },
  { header: 'Result', value: (e) => e.result },
]

const KPI_NOTE_TONE: Record<AdminKpiTone, string> = {
  positive: 'text-emerald-600',
  neutral: 'text-on-surface-variant',
  brand: 'text-secondary',
  critical: 'text-red-600',
}

const QUEUE_TONE: Record<OperationalQueueItem['tone'], { chip: string; badge: string }> = {
  error: { chip: 'bg-red-500/10 text-red-600', badge: 'text-red-600 bg-red-500/10' },
  warning: { chip: 'bg-amber-500/10 text-amber-600', badge: 'text-amber-600 bg-amber-500/10' },
  secondary: { chip: 'bg-secondary/10 text-secondary', badge: 'text-secondary bg-secondary/10' },
}

const MOD_TONE: Record<ModerationStat['tone'], string> = {
  error: 'text-red-600',
  warning: 'text-amber-600',
  neutral: 'text-on-surface',
}

/** Colored badge for an audit action, keyed off the action verb (Stitch parity). */
function auditBadge(action: string): string {
  if (action.includes('SUSPENSION') || action.includes('BLOCK')) return 'bg-red-50 text-red-700 border-red-100'
  if (action.includes('VERIFIED') || action.includes('APPROVE')) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  return 'bg-blue-50 text-blue-700 border-blue-100'
}

const CARD = 'bg-surface-container-lowest border border-outline-variant rounded-lg'

function HealthRow({ metric }: { metric: PlatformHealthMetric }) {
  const valueTone = metric.tone === 'good' ? 'text-emerald-600' : 'text-on-surface'
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-on-surface-variant">{metric.label}</span>
      {metric.fill == null ? (
        <span className={`text-[11px] font-bold ${valueTone}`}>{metric.value}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold ${valueTone}`}>{metric.value}</span>
          <div
            className={`h-1 w-8 overflow-hidden rounded-full ${metric.tone === 'good' ? 'bg-emerald-500/20' : 'bg-on-surface/10'}`}
          >
            <div
              className={`h-full ${metric.tone === 'good' ? 'bg-emerald-500' : 'bg-secondary'}`}
              style={{ width: `${metric.fill}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminDashboard() {
  const { data, loading, error } = useAsync<AdminDashboardData>(() => adminService.dashboard())
  const [query, setQuery] = useState('')
  const institutions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!data) return []
    if (!term) return data.institutions
    return data.institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.location.toLowerCase().includes(term) ||
        i.principal.toLowerCase().includes(term),
    )
  }, [data, query])

  if (loading) return <PageLoader />
  if (error || !data) {
    return (
      <EmptyState
        icon="dashboard"
        title="Dashboard unavailable"
        description={error ?? 'The platform snapshot could not be loaded.'}
      />
    )
  }

  const maxAdoption = Math.max(...data.adoption.map((a) => a.value), 1)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 text-[13px] text-on-surface">
      {/* Header & quick actions */}
      <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Platform Snapshot</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Control and monitoring of global SaaS infrastructure.
          </p>
        </div>
        {/* ponytail: creating institutions, inviting principals and minting
            admins all need write endpoints the admin repository does not
            expose — the dashboard routes to the directories that do the work
            instead of shipping three buttons that do nothing. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-1.5">
          <Link
            to={ROUTES.ADMIN.INSTITUTIONS}
            className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1.5 text-[11px] font-bold text-on-secondary transition-colors hover:bg-secondary/90"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">apartment</span> Manage Institutions
          </Link>
          <Link
            to={ROUTES.ADMIN.USERS}
            className="flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">group</span> Manage Users
          </Link>
          <div className="mx-1 h-6 w-px bg-outline-variant" />
          <button
            type="button"
            onClick={() => downloadCsv('crce-os-institutions-snapshot.csv', SNAPSHOT_COLUMNS, data.institutions)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span> Export Snapshot
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {data.kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-lg border border-outline-variant p-4 ${
              kpi.tone === 'critical'
                ? 'bg-red-500/[0.02] ring-1 ring-red-500/20'
                : 'bg-surface-container-lowest'
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                kpi.tone === 'critical' ? 'text-red-600' : 'text-on-surface-variant'
              }`}
            >
              {kpi.label}
            </p>
            <h3 className="mt-1 text-2xl font-bold">{kpi.value}</h3>
            <p className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${KPI_NOTE_TONE[kpi.tone]}`}>
              {kpi.tone === 'positive' && (
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">trending_up</span>
              )}
              {kpi.note}
            </p>
          </div>
        ))}
      </section>

      {/* Monthly adoption growth */}
      <section className={`${CARD} p-4`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">trending_up</span>
            Monthly Adoption Growth
          </h3>
          <span className="text-[10px] font-medium text-on-surface-variant">Jan - Jun 2023</span>
        </div>
        <div className="flex h-28 items-end justify-between gap-2 px-2" role="img" aria-label="Monthly adoption growth chart">
          {data.adoption.map((point, i) => (
            <div key={point.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-t bg-secondary"
                style={{
                  height: `${Math.round((point.value / maxAdoption) * 90)}%`,
                  opacity: Math.min(1, 0.2 + i * 0.16),
                }}
                title={`${point.month}: ${point.value}`}
              />
              <span className="text-[9px] font-bold">{point.month}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Operational queue */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">pending_actions</span>
          Operational Queue
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.operationalQueue.map((item) => (
            <div
              key={item.id}
              className={`${CARD} flex items-center gap-4 p-3 transition-colors hover:border-secondary/30`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${QUEUE_TONE[item.tone].chip}`}>
                <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className={`rounded px-1 text-[10px] font-bold uppercase ${QUEUE_TONE[item.tone].badge}`}>
                    {item.priority}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-lg font-bold">{item.count}</span>
                  <span className="text-[10px] text-on-surface-variant">{item.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Moderation center */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold">
          <span className="material-symbols-outlined text-red-600" aria-hidden="true">gavel</span>
          Moderation Center
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {data.moderation.map((stat) => (
            <div key={stat.label} className={`${CARD} p-2.5 text-center`}>
              <p className="text-[9px] font-bold uppercase text-on-surface-variant">{stat.label}</p>
              <p className={`text-lg font-bold ${MOD_TONE[stat.tone]}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Institution management + right rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className={`${CARD} flex flex-col lg:col-span-8`}>
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant p-4 sm:flex-row sm:items-center">
            <h3 className="text-sm font-bold">Institution Management</h3>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search institutions..."
                aria-label="Search institutions"
                className="w-48 rounded border border-outline-variant bg-background py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-secondary/50 xl:w-64"
              />
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="border-b border-outline-variant bg-surface-container/30 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-4 py-3">Institution</th>
                  <th scope="col" className="px-4 py-3">Principal</th>
                  <th scope="col" className="px-4 py-3 text-center">Students</th>
                  <th scope="col" className="px-4 py-3 text-center">Faculty</th>
                  <th scope="col" className="px-4 py-3 text-center">Projects</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Participation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="transition-colors hover:bg-surface-container/40">
                    <td className="px-4 py-3">
                      <div className="font-bold">{inst.name}</div>
                      <div className="text-[10px] text-on-surface-variant">{inst.location}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{inst.principal}</td>
                    <td className="px-4 py-3 text-center font-mono">{inst.students.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-mono">{inst.faculty}</td>
                    <td className="px-4 py-3 text-center font-mono">{inst.projects}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          inst.status === 'Active'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          inst.participationActive ? 'text-secondary' : 'text-on-surface-variant'
                        }`}
                      >
                        {inst.participation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {institutions.length === 0 && (
              <p className="p-4 text-center text-[11px] text-on-surface-variant">
                No institutions match “{query}”.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container/10 p-3">
            <p className="text-[10px] font-medium text-on-surface-variant">
              Showing {institutions.length} of {data.institutions.length} institutions
            </p>
            <Link to={ROUTES.ADMIN.INSTITUTIONS} className="text-[10px] font-bold text-secondary hover:underline">
              Open full directory
            </Link>
          </div>
        </section>

        {/* Right rail */}
        <section className="space-y-6 lg:col-span-4">
          <div className={`${CARD} p-4`}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">history</span>
              Recent Inst. Activity
            </h3>
            <div className="space-y-3">
              {data.recentInstitutionActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary" />
                  <div>
                    <p className="text-[11px] font-bold">{item.institution}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <span className="material-symbols-outlined text-emerald-600" aria-hidden="true">analytics</span>
              Platform Health
            </h3>
            <div className="space-y-3">
              {data.platformHealth.map((metric) => (
                <HealthRow key={metric.label} metric={metric} />
              ))}
            </div>
          </div>

          <div className={`${CARD} flex flex-col overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-outline-variant p-4">
              <h3 className="text-sm font-bold">System Logs</h3>
              <span className="text-[10px] font-medium text-on-surface-variant">
                Last {data.systemLogs.length} events
              </span>
            </div>
            <div className="max-h-[300px] flex-1 divide-y divide-outline-variant overflow-y-auto">
              {data.systemLogs.map((log) => (
                <div key={log.id} className="p-3 transition-colors hover:bg-surface-container/40">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] text-on-surface-variant">{log.time}</span>
                    <span
                      className={`rounded border px-1 text-[9px] font-bold ${
                        log.result === 'SUCCESS'
                          ? 'border-emerald-500/20 text-emerald-600'
                          : 'border-red-500/20 text-red-600'
                      }`}
                    >
                      {log.result}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px]">
                    <span className="font-bold">{log.actor}</span> {log.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Full transaction audit */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-sm font-bold">Full Transaction Audit</h3>
          <button
            type="button"
            onClick={() => downloadCsv('crce-os-audit-log.csv', AUDIT_COLUMNS, data.auditLog)}
            className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">file_download</span> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="border-b border-outline-variant bg-surface-container/30 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-2.5">Timestamp</th>
                <th scope="col" className="px-4 py-2.5">Action</th>
                <th scope="col" className="px-4 py-2.5">Actor</th>
                <th scope="col" className="px-4 py-2.5">Target</th>
                <th scope="col" className="px-4 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-[11px]">
              {data.auditLog.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-surface-container/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-on-surface-variant">{entry.timestamp}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded border px-1.5 py-0.5 ${auditBadge(entry.action)}`}>{entry.action}</span>
                  </td>
                  <td className="px-4 py-2.5">{entry.actor}</td>
                  <td className="px-4 py-2.5">{entry.target}</td>
                  <td className={`px-4 py-2.5 font-bold ${entry.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {entry.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
