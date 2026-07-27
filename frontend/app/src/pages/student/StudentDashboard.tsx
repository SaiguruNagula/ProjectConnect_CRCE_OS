/**
 * Student dashboard — the primary post-login page. Faithful migration of the
 * Stitch "Central Command Center": welcome header, quick stats, quick actions,
 * active projects, and an urgent-reviews rail. All data is read-only through
 * existing services (dashboard / projects / portfolio); no scoring or business
 * logic lives here. App chrome (top bar, footer, mobile nav) is owned by
 * StudentLayout and is intentionally not reproduced here.
 */
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService, projectsService, portfolioService } from '@/services/catalog.service'
import { buildPath, ROUTES } from '@/constants/routes'
import { initials } from '@/utils/initials'
import type { DashboardStats, Deadline, Invitation, Portfolio, Project, ProjectStatus } from '@/types/domain'
import type { BadgeProps } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS: Record<ProjectStatus, { label: string; tone: BadgeProps['tone'] }> = {
  active: { label: 'Core', tone: 'primary' },
  in_review: { label: 'Research', tone: 'warning' },
  completed: { label: 'Innovate', tone: 'success' },
}

const QUICK_ACTIONS = [
  { label: 'Browse Problems', icon: 'search', to: ROUTES.SHARED.OPEN_PROBLEMS },
  { label: 'My Projects', icon: 'rocket_launch', to: ROUTES.STUDENT.PROJECTS },
  { label: 'Portfolio', icon: 'badge', to: buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' }) },
  { label: 'Leaderboard', icon: 'leaderboard', to: ROUTES.SHARED.LEADERBOARD },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function currentMilestone(project: Project): string {
  const m =
    project.milestones.find((ms) => ms.status === 'in_progress') ??
    project.milestones.find((ms) => ms.status === 'pending') ??
    project.milestones.at(-1)
  return m ? `Milestone: ${m.title}` : 'No active milestone'
}

function dueLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function StudentDashboard() {
  const { user } = useAuth()
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('student'))
  const projects = useAsync<Project[]>(() => projectsService.list())
  const invitations = useAsync<Invitation[]>(() => projectsService.invitations())
  const deadlines = useAsync<Deadline[]>(() => dashboardService.deadlines())
  const portfolio = useAsync<Portfolio>(() => portfolioService.get(user?.id ?? 'me'), [user?.id])

  const firstName = user?.name.split(' ')[0] ?? 'Student'
  const findStat = (label: string) => stats.data?.find((s) => s.label === label)?.value
  const rank = findStat('Leaderboard')
  const credits = findStat('Total Credits')

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg">
      {/* Welcome header */}
      <section className="flex flex-col items-center gap-md text-center md:flex-row md:items-start md:text-left">
        <div className="relative shrink-0">
          <Avatar
            initials={initials(user?.name ?? 'S')}
            size="xl"
            className="rounded-xl border-2 border-primary-fixed md:h-32 md:w-32 md:text-3xl"
          />
          <span className="absolute -bottom-2 -right-2 rounded-full border-2 border-surface-container-lowest bg-secondary px-2 py-base text-[10px] font-bold text-on-secondary">
            TOP 1%
          </span>
        </div>
        <div className="flex-1">
          <div className="flex flex-col items-center gap-xs md:flex-row md:items-baseline md:gap-sm">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
              {portfolio.data?.name ?? user?.name ?? 'Student'}
            </h1>
            {portfolio.data?.department && (
              <span className="rounded-full bg-secondary-container/20 px-3 py-1 text-label-md font-medium uppercase text-secondary">
                {portfolio.data.department}
              </span>
            )}
          </div>
          <p className="mt-xs max-w-2xl text-body-lg text-on-surface-variant">
            {greeting()}, {firstName}. You're ranked{' '}
            <span className="font-bold text-secondary">{rank ?? '—'}</span> with{' '}
            <span className="font-bold text-secondary">{credits ?? '—'}</span> credits. Keep up the momentum!
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-gutter lg:col-span-8">
          {/* Quick stats */}
          {stats.loading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
              {stats.data?.map((s) => (
                <Card key={s.label} className="flex flex-col gap-xs bg-surface-container-low transition-shadow hover:shadow-sm">
                  <p className="text-label-sm font-medium uppercase text-on-surface-variant">{s.label}</p>
                  <h3 className={`text-2xl font-bold ${s.label === 'Pending Tasks' ? 'text-error' : 'text-secondary'}`}>
                    {s.value}
                  </h3>
                  {s.delta && (
                    <p
                      className={`flex items-center gap-1 text-xs ${
                        s.delta.startsWith('+') ? 'text-[#1e7a3d]' : 'text-on-surface-variant'
                      }`}
                    >
                      {s.delta.startsWith('+') && (
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">trending_up</span>
                      )}
                      {s.delta}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-label-md font-medium text-on-surface transition-all hover:border-secondary hover:bg-secondary/5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>

          {/* Active projects */}
          <Card className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm font-semibold text-on-surface">Active Projects</h2>
              <Link to={ROUTES.STUDENT.PROJECTS} className="text-label-md font-medium text-secondary hover:underline">
                View All
              </Link>
            </div>
            {projects.loading ? (
              <PageLoader />
            ) : projects.data && projects.data.length > 0 ? (
              <div className="flex flex-col gap-sm">
                {projects.data.slice(0, 3).map((p) => (
                  <ActiveProjectRow key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <EmptyState icon="rocket_launch" title="No active projects yet" />
            )}
          </Card>
        </div>

        {/* Right column — urgent reviews rail */}
        <div className="flex flex-col gap-gutter lg:col-span-4">
          <Card className="flex flex-col gap-md">
            <h2 className="flex items-center gap-xs text-headline-sm font-semibold text-on-surface">
              <span className="material-symbols-outlined text-error" aria-hidden="true">priority_high</span>
              Urgent Reviews
            </h2>
            {(deadlines.data && deadlines.data.length > 0) || (invitations.data && invitations.data.length > 0) ? (
              <div className="flex flex-col gap-sm">
                {deadlines.data?.[0] && <UrgentDeadline deadline={deadlines.data[0]} />}
                {invitations.data?.[0] && <UrgentInvitation invitation={invitations.data[0]} />}
              </div>
            ) : (
              <EmptyState icon="task_alt" title="You're all caught up" />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function ActiveProjectRow({ project }: { project: Project }) {
  const status = STATUS[project.status]
  return (
    <Link
      to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: project.id })}
      className="group flex flex-col justify-between gap-md rounded-xl border border-transparent bg-surface-container-low p-md transition-all hover:border-outline-variant md:flex-row md:items-center"
    >
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-xs">
          <h3 className="text-body-lg font-semibold text-on-surface">{project.title}</h3>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mb-sm text-xs text-on-surface-variant">{currentMilestone(project)}</p>
        <ProgressBar value={project.progress} className="h-1.5" />
      </div>
      <div className="flex items-center gap-lg md:ml-lg">
        <div className="flex -space-x-2">
          {project.members.slice(0, 3).map((m) => (
            <Avatar key={m.id} initials={m.avatarInitials} size="sm" className="ring-2 ring-surface-container-lowest" />
          ))}
          {project.members.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-on-secondary ring-2 ring-surface-container-lowest">
              +{project.members.length - 3}
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-on-surface-variant transition-colors group-hover:text-secondary" aria-hidden="true">
          arrow_forward_ios
        </span>
      </div>
    </Link>
  )
}

function UrgentDeadline({ deadline }: { deadline: Deadline }) {
  return (
    <div className="rounded-lg border-l-4 border-error bg-error-container/20 p-sm">
      <h3 className="text-body-sm font-semibold text-on-surface">{deadline.title}</h3>
      <p className="text-[10px] text-on-surface-variant">
        Due {dueLabel(deadline.due)} • {deadline.project}
      </p>
    </div>
  )
}

function UrgentInvitation({ invitation }: { invitation: Invitation }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-sm">
      <h3 className="text-body-sm font-semibold text-on-surface">Team Invitation: {invitation.projectTitle}</h3>
      <p className="text-[10px] text-on-surface-variant">
        Invited by {invitation.invitedBy} • {invitation.role}
      </p>
      <Link to={ROUTES.SHARED.TEAM_FORMATION} className="mt-xs inline-block text-[10px] font-bold text-secondary hover:underline">
        VIEW INVITE
      </Link>
    </div>
  )
}
