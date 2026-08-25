/**
 * Admin Users — the institutional "Access & Identity" console. Faithful
 * migration of the Stitch prototype
 * (frontend/projectconnect_admin_refined_user_management_console): a header with
 * quick actions, a six-tile KPI grid, a verification center, and a two-column
 * body — the searchable/filterable user directory on the left, platform identity
 * health + audit log on the right.
 *
 * The directory reads through adminService.users(); the surrounding panels
 * through adminService.usersOverview(). No user data is hardcoded in JSX and no
 * business logic lives here. App chrome (sidebar, top bar, mobile nav) is owned
 * by AdminLayout / RoleLayout and is intentionally not reproduced. Stitch's
 * `success`/`warning` tokens map to Tailwind emerald/amber (the app palette has
 * no such tokens), matching the Admin Dashboard.
 */
import { useEffect, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/catalog.service'
import type {
  DirectoryUser,
  PlatformHealthMetric,
  UserKpi,
  UsersOverview,
  VerificationQueueItem,
} from '@/types/domain'
import { Avatar } from '@/components/ui/Avatar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { downloadCsv } from '@/utils/csv'
import { initials } from '@/utils/initials'

const CARD = 'bg-surface-container-lowest border border-outline-variant rounded-lg'
const PAGE_SIZE = 10

/** Export shape of the directory — header order and fields in one place. */
const USER_COLUMNS: { header: string; value: (u: DirectoryUser) => unknown }[] = [
  { header: 'Name', value: (u) => u.name },
  { header: 'Email', value: (u) => u.email },
  { header: 'Institution', value: (u) => u.institution },
  { header: 'Department', value: (u) => u.department },
  { header: 'Role', value: (u) => u.role },
  { header: 'Credits', value: (u) => u.credits },
  { header: 'Projects', value: (u) => u.projects },
  { header: 'Status', value: (u) => u.status },
]

/** Per-role badge colours (Stitch: Faculty indigo, Student blue). */
const ROLE_BADGE: Record<DirectoryUser['role'], string> = {
  student: 'bg-blue-50 text-blue-700 border-blue-100',
  faculty: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  admin: 'bg-slate-100 text-slate-700 border-slate-200',
  principal: 'bg-amber-50 text-amber-700 border-amber-100',
}

const STATUS_DOT: Record<DirectoryUser['status'], { text: string; dot: string; pulse?: boolean }> = {
  active: { text: 'text-emerald-600', dot: 'bg-emerald-500' },
  pending: { text: 'text-amber-600', dot: 'bg-amber-500', pulse: true },
  suspended: { text: 'text-red-600', dot: 'bg-red-500' },
}

const QUEUE_TONE: Record<VerificationQueueItem['tone'], { chip: string; badge: string }> = {
  secondary: { chip: 'bg-secondary/10 text-secondary', badge: 'text-secondary bg-secondary/10' },
  warning: { chip: 'bg-amber-500/10 text-amber-600', badge: 'text-amber-600 bg-amber-500/10' },
  error: { chip: 'bg-red-500/10 text-red-600', badge: 'text-red-600 bg-red-500/10' },
  neutral: { chip: 'bg-on-surface/5 text-on-surface-variant', badge: 'text-on-surface-variant bg-on-surface/10' },
}

function KpiTile({ kpi }: { kpi: UserKpi }) {
  return (
    <div
      className={`rounded-lg border border-outline-variant p-4 ${
        kpi.ring ? 'bg-red-500/[0.02] ring-1 ring-red-500/20' : 'bg-surface-container-lowest'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          kpi.ring ? 'text-red-600' : 'text-on-surface-variant'
        }`}
      >
        {kpi.label}
      </p>
      <h3 className="mt-1 text-2xl font-bold">{kpi.value}</h3>
      {kpi.progress != null ? (
        <div className="mt-2 h-1 w-full rounded-full bg-secondary/10">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${kpi.progress}%` }} />
        </div>
      ) : (
        kpi.note && (
          <p className={`mt-1 text-[10px] font-medium ${kpi.tone === 'critical' ? 'text-red-600' : 'text-emerald-600'}`}>
            {kpi.note}
          </p>
        )
      )}
    </div>
  )
}

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
          <div className="h-1 w-8 overflow-hidden rounded-full bg-emerald-500/20">
            <div className="h-full bg-emerald-500" style={{ width: `${metric.fill}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminUsersPage() {
  const users = useAsync<DirectoryUser[]>(() => adminService.users())
  const overview = useAsync<UsersOverview>(() => adminService.usersOverview())
  const [query, setQuery] = useState('')
  const [institution, setInstitution] = useState('All')

  const institutions = useMemo(
    () => ['All', ...Array.from(new Set((users.data ?? []).map((u) => u.institution)))],
    [users.data],
  )

  const rows = useMemo(() => {
    const q = query.toLowerCase()
    return (users.data ?? []).filter(
      (u) =>
        (institution === 'All' || u.institution === institution) &&
        (u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.institution.toLowerCase().includes(q)),
    )
  }, [users.data, query, institution])

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  // A narrowed filter can leave the reader on a page that no longer exists.
  useEffect(() => setPage(1), [query, institution])
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstOnPage = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 text-[13px] text-on-surface">
      {/* Header & quick actions */}
      <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Access &amp; Identity</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Comprehensive control over students, faculty, and administrative accounts.
          </p>
        </div>
        {/* ponytail: invites and bulk actions need endpoints that do not exist —
            dropped rather than shipped as inert buttons. Export is real. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-1.5">
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => downloadCsv('crce-os-users.csv', USER_COLUMNS, rows)}
            className="flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">file_download</span>
            Export {rows.length > 0 && <span className="font-mono">({rows.length})</span>}
          </button>
        </div>
      </div>

      {/* KPI grid */}
      {overview.data && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {overview.data.kpis.map((kpi) => (
            <KpiTile key={kpi.label} kpi={kpi} />
          ))}
        </section>
      )}

      {/* Verification center — hidden while no verification workflow feeds it. */}
      {overview.data && overview.data.verificationQueue.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-[13px] font-bold">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">verified_user</span>
            Verification Center
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Counters, not actions — there is no verification workflow route. */}
            {overview.data.verificationQueue.map((item) => (
              <div key={item.id} className={`${CARD} flex items-center gap-4 p-3 text-left`}>
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
                  <div className="text-lg font-bold">
                    {item.count} <span className="text-[10px] font-normal text-on-surface-variant">{item.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Directory + right rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* User directory */}
        <section className={`${CARD} flex h-fit flex-col lg:col-span-8`}>
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant p-4 sm:flex-row sm:items-center">
            <h3 className="text-sm font-bold">User Directory</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, institution..."
                  aria-label="Search users"
                  className="w-48 rounded border border-outline-variant bg-background py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-secondary/50 xl:w-64"
                />
              </div>
              <div className="flex items-center gap-1 rounded bg-surface-container p-1">
                {institutions.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setInstitution(inst)}
                    className={`rounded px-2 py-1 text-[10px] transition-colors ${
                      institution === inst
                        ? 'bg-surface-container-lowest font-bold shadow-sm'
                        : 'font-medium text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {users.loading ? (
            <PageLoader />
          ) : users.error ? (
            <EmptyState icon="error" title="Couldn't load users" description={users.error} />
          ) : rows.length === 0 ? (
            <EmptyState icon="group_off" title="No users match your filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead className="border-b border-outline-variant bg-surface-container/30 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Institution</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3 text-center">Credits</th>
                    <th scope="col" className="px-4 py-3 text-center">Projects</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {pageRows.map((u) => {
                    const status = STATUS_DOT[u.status]
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-surface-container/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar initials={initials(u.name)} size="sm" />
                            <div>
                              <p className="font-bold">{u.name}</p>
                              <p className="text-[10px] text-on-surface-variant">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{u.institution}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_BADGE[u.role]}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium">{u.credits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-mono font-medium">{u.projects}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold capitalize ${status.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-outline-variant bg-surface-container/10 p-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              summary={`Showing ${firstOnPage}–${Math.min(page * PAGE_SIZE, rows.length)} of ${rows.length} users`}
            />
            {totalPages <= 1 && (
              <p className="text-[10px] font-medium text-on-surface-variant">
                Showing {rows.length} of {users.data?.length ?? 0} users
              </p>
            )}
          </div>
        </section>

        {/* Right rail */}
        <section className="space-y-6 lg:col-span-4">
          {overview.data && overview.data.identityHealth.length > 0 && (
            <div className={`${CARD} p-4`}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <span className="material-symbols-outlined" aria-hidden="true">analytics</span>
                Platform Identity Health
              </h3>
              <div className="space-y-3">
                {overview.data.identityHealth.map((metric) => (
                  <HealthRow key={metric.label} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {overview.data && overview.data.auditLog.length > 0 && (
            <div className={`${CARD} flex flex-col overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-outline-variant p-4">
                <h3 className="text-sm font-bold">Audit Log</h3>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  Last {overview.data.auditLog.length} events
                </span>
              </div>
              <div className="flex-1 divide-y divide-outline-variant">
                {overview.data.auditLog.map((entry) => (
                  <div key={entry.id} className="p-3 transition-colors hover:bg-surface-container/40">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] text-on-surface-variant">{entry.time}</span>
                      <span
                        className={`rounded border px-1 text-[9px] font-bold ${
                          entry.ok ? 'border-emerald-500/20 text-emerald-600' : 'border-red-500/20 text-red-600'
                        }`}
                      >
                        {entry.result}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px]">
                      <span className="font-bold">{entry.actor}</span> {entry.message}{' '}
                      <span className="font-medium text-secondary">{entry.target}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
