/**
 * Faculty dashboard — the faculty member's command center. Faithful migration of
 * the Stitch "Faculty Innovation Dashboard" (frontend/crce_os_faculty_innovation_dashboard):
 * a welcome hero with a review CTA, a horizontal impact-metrics rail, and a
 * two-column body — pending review queue + active problems on the left,
 * mentorship progress + recent activity on the right. All data is read-only
 * through existing services (dashboard / reviews / problems / projects); no
 * scoring or business logic lives here. App chrome (top bar, sidebar, mobile
 * nav, footer) is owned by FacultyLayout and intentionally not reproduced.
 */
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService, reviewsService, problemsService, projectsService } from '@/services/catalog.service'
import type { Activity, DashboardStats, Problem, Project, ReviewSubmission } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

/** Mentorship health derived from a project's progress (Stitch: Healthy / Delayed / At Risk). */
function health(progress: number): { label: string; badge: string; bar: string; atRisk: boolean } {
  if (progress >= 70) return { label: 'Healthy', badge: 'bg-green-100 text-green-700', bar: 'bg-green-500', atRisk: false }
  if (progress >= 40) return { label: 'Delayed', badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500', atRisk: false }
  return { label: 'At Risk', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500', atRisk: true }
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} mins ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hours ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export function FacultyDashboard() {
  const { user } = useAuth()
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('faculty'))
  const reviews = useAsync<ReviewSubmission[]>(() => reviewsService.list())
  const problems = useAsync<Problem[]>(() => problemsService.list())
  const projects = useAsync<Project[]>(() => projectsService.list())
  const activity = useAsync<Activity[]>(() => dashboardService.activity())

  const firstName = user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Faculty'
  const pending = (reviews.data ?? []).filter((r) => r.status !== 'approved')

  // The faculty's own problems (fall back to open problems if none match this user).
  const own = (problems.data ?? []).filter((p) => p.facultyName === user?.name)
  const activeProblems = (own.length ? own : (problems.data ?? []).filter((p) => p.status !== 'closed')).slice(0, 4)
  const mentored = (projects.data ?? []).slice(0, 3)

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg">
      {/* Hero */}
      <section className="flex flex-col justify-between gap-md py-xs md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-display">
            Welcome back, {firstName}
          </h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            You have several critical project reviews awaiting your attention today.
          </p>
        </div>
        <Link
          to={ROUTES.FACULTY.REVIEWS}
          className="flex w-fit items-center gap-sm rounded-xl bg-secondary px-lg py-md font-semibold text-on-secondary shadow-lg shadow-secondary/20 transition-all hover:bg-secondary/90 active:scale-95"
        >
          Start Reviewing ({pending.length} Pending)
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </section>

      {/* Impact metrics rail */}
      {stats.loading ? (
        <PageLoader />
      ) : (
        <section className="-mx-md overflow-x-auto px-md pb-xs md:mx-0 md:px-0">
          <div className="flex min-w-max gap-md">
            {stats.data?.map((s) => (
              <div
                key={s.label}
                className="w-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm"
              >
                <span
                  className="material-symbols-outlined mb-xs text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {s.icon}
                </span>
                <div className="text-display font-bold text-on-surface">{s.value}</div>
                <div className="text-label-md uppercase tracking-wider text-on-surface-variant">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        {/* Left column — review queue + active problems */}
        <div className="flex flex-col gap-lg lg:col-span-8">
          {/* Pending Review Queue */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-outline-variant p-md">
              <h2 className="text-headline-sm font-semibold text-on-surface">Pending Review Queue</h2>
              <Link
                to={ROUTES.FACULTY.REVIEWS}
                className="flex items-center gap-xs text-body-md font-semibold text-secondary hover:underline"
              >
                Open Review Queue
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
              </Link>
            </div>
            {reviews.loading ? (
              <div className="p-md">
                <PageLoader />
              </div>
            ) : pending.length > 0 ? (
              <div className="divide-y divide-outline-variant/30">
                {pending.map((r) => {
                  const lead = r.members[0]
                  return (
                    <Link
                      key={r.id}
                      to={ROUTES.FACULTY.REVIEWS}
                      className="group flex items-center justify-between p-md transition-colors hover:bg-surface-container-low"
                    >
                      <div className="flex items-center gap-md">
                        <Avatar initials={lead?.avatarInitials ?? r.teamName.slice(0, 2).toUpperCase()} />
                        <div>
                          <div className="text-body-md font-semibold text-on-surface">{lead?.name ?? r.teamName}</div>
                          <div className="text-xs text-on-surface-variant">
                            {r.projectTitle} • <span className="text-secondary">{r.milestone}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="material-symbols-outlined text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        chevron_right
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-md">
                <EmptyState icon="task_alt" title="All caught up — no reviews pending" />
              </div>
            )}
          </Card>

          {/* My Active Problems */}
          <section>
            <div className="mb-md flex items-center justify-between">
              <h2 className="text-headline-sm font-semibold text-on-surface">My Active Problems</h2>
              <Link
                to={ROUTES.FACULTY.CREATE_PROBLEM}
                className="flex items-center gap-xs rounded-lg bg-surface-tint px-md py-sm text-sm font-semibold text-on-secondary transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                Post New Problem
              </Link>
            </div>
            {activeProblems.length > 0 ? (
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                {activeProblems.map((p) => (
                  <Card key={p.id} className="flex flex-col gap-sm shadow-sm">
                    <h3 className="line-clamp-1 text-body-lg font-bold text-on-surface">{p.title}</h3>
                    <div className="flex gap-md border-t border-outline-variant/30 pt-sm">
                      <Stat value={p.currentTeamCount} label="Teams" />
                      <div className="border-l border-outline-variant/30 pl-md">
                        <Stat value={p.solutionsCount ?? 0} label="Solutions" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState icon="lightbulb" title="No active problems yet" />
              </Card>
            )}
          </section>
        </div>

        {/* Right column — mentorship progress + recent activity */}
        <div className="flex flex-col gap-lg lg:col-span-4">
          {/* Mentorship Progress */}
          <section className="flex flex-col gap-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Mentorship Progress</h2>
            {projects.loading ? (
              <PageLoader />
            ) : mentored.length > 0 ? (
              <div className="flex flex-col gap-md">
                {mentored.map((p) => {
                  const h = health(p.progress)
                  const done = p.milestones.filter((m) => m.status === 'done').length
                  return (
                    <Card key={p.id} className={cn('shadow-sm', h.atRisk && 'border-l-4 border-l-error')}>
                      <div className="mb-sm flex items-start justify-between">
                        <h3 className="text-body-md font-bold leading-tight text-on-surface">{p.title}</h3>
                        <span className={cn('rounded px-xs py-0.5 text-[10px] font-bold uppercase tracking-tighter', h.badge)}>
                          {h.label}
                        </span>
                      </div>
                      <ProgressBar
                        value={p.progress}
                        className="mb-xs h-1 bg-surface-container-highest"
                        indicatorClassName={h.bar}
                      />
                      <div className="flex justify-between text-[10px] font-medium uppercase text-on-surface-variant">
                        <span>Milestone {done}/{p.milestones.length}</span>
                        <span>{p.progress}%</span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <EmptyState icon="hub" title="No projects under mentorship" />
              </Card>
            )}
          </section>

          {/* Recent Activity */}
          <Card className="shadow-sm">
            <h2 className="mb-md text-headline-sm font-semibold text-on-surface">Recent Activity</h2>
            {activity.data && activity.data.length > 0 ? (
              <div className="flex flex-col">
                {activity.data.map((a, i, arr) => (
                  <div key={a.id} className="flex gap-md">
                    <div className="flex flex-col items-center">
                      <div className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', i === 0 ? 'bg-secondary' : 'bg-outline-variant')} />
                      {i < arr.length - 1 && <div className="mt-1 w-px flex-1 bg-outline-variant/50" />}
                    </div>
                    <div className="pb-md">
                      <p className="text-body-md text-on-surface">
                        {a.actor} {a.action} <span className="font-bold">{a.target}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">{relativeTime(a.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="history" title="No recent activity" />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-on-surface">{String(value).padStart(2, '0')}</div>
      <div className="text-xs font-medium uppercase text-on-surface-variant">{label}</div>
    </div>
  )
}
