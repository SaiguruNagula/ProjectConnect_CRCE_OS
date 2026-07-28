/**
 * My Projects — faithful migration of the Stitch "Architectural Refinement"
 * design: a bento grid of active-project cards (status health, progress, next
 * action, team) above a two-column rail of pending invitations and completed
 * projects. Data is read-only through the existing projects service; the only
 * derived display values (health, current phase, next action, completion date)
 * live in small helpers below, never inside the JSX. App chrome is owned by
 * StudentLayout and is intentionally not reproduced here.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { useInvitations } from '@/hooks/useInvitations'
import { projectsService } from '@/services/catalog.service'
import type { Invitation, Project } from '@/types/domain'
import type { BadgeProps } from '@/components/ui/Badge'
import { buildPath, ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionBanner } from '@/components/feedback/ActionBanner'

interface Health {
  label: string
  tone: BadgeProps['tone']
  /** Fill colour for the progress bar. */
  indicator: string
  /** Material symbol shown beside the "Next" action. */
  icon: string
}

/** Display-only health signal derived from progress + milestone timing. */
function health(project: Project): Health {
  if (project.progress < 20) {
    return { label: 'Initialization', tone: 'neutral', indicator: 'bg-secondary', icon: 'edit_note' }
  }
  const now = Date.now()
  const overdue = project.milestones.some(
    (m) => m.status === 'in_progress' && new Date(`${m.dueDate}T00:00:00`).getTime() < now,
  )
  if (overdue) {
    return { label: 'At Risk', tone: 'warning', indicator: 'bg-error', icon: 'hourglass_empty' }
  }
  return { label: 'On Track', tone: 'success', indicator: 'bg-secondary', icon: 'event_repeat' }
}

/** The milestone currently in flight — used as the progress-bar label. */
function currentPhase(project: Project): string {
  const m =
    project.milestones.find((ms) => ms.status === 'in_progress') ??
    project.milestones.find((ms) => ms.status === 'pending') ??
    project.milestones.at(-1)
  return m?.title ?? 'In progress'
}

/** The next actionable milestone — used as the "Next" prompt. */
function nextAction(project: Project): string {
  const m =
    project.milestones.find((ms) => ms.status === 'pending') ??
    project.milestones.find((ms) => ms.status === 'in_progress')
  return m?.title ?? 'Awaiting update'
}

/** Month/year a completed project wrapped up, from its final milestone. */
function completedOn(project: Project): string {
  const last = project.milestones.at(-1)
  if (!last) return ''
  return new Date(`${last.dueDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export function MyProjectsPage() {
  const projects = useAsync<Project[]>(() => projectsService.list())
  // Accepting an invitation adds a project — refresh the grid with the feed.
  const invitations = useInvitations(projects.reload)

  const active = useMemo(
    () => (projects.data ?? []).filter((p) => p.status !== 'completed'),
    [projects.data],
  )
  const completed = useMemo(
    () => (projects.data ?? []).filter((p) => p.status === 'completed'),
    [projects.data],
  )
  const pending = invitations.invitations

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-xl">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div>
          <h1 className="mb-1 text-headline-lg font-bold tracking-tight text-on-surface">My Projects</h1>
          <p className="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
            <span className="font-semibold text-secondary">{active.length} Active</span> •
            <span>{pending.length} Pending</span> •
            <span>{completed.length} Completed</span>
          </p>
        </div>
        <Link to={ROUTES.SHARED.OPEN_PROBLEMS}>
          <Button variant="outline" className="shadow-sm active:scale-95">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">explore</span>
            Browse Open Problems
          </Button>
        </Link>
      </div>

      {/* Active projects */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-semibold text-on-surface">Active Projects</h2>
          {active[0] && (
            <Link
              to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: active[0].id })}
              className="text-label-md font-semibold text-secondary hover:underline"
            >
              View Timeline
            </Link>
          )}
        </div>

        {projects.loading ? (
          <PageLoader />
        ) : projects.error ? (
          <EmptyState icon="error" title="Couldn't load your projects" description={projects.error} />
        ) : active.length === 0 ? (
          <EmptyState
            icon="rocket_launch"
            title="No active projects"
            description="Browse open problems to join or start a project."
          />
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-3">
            {active.map((p) => (
              <ActiveProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Invitations + completed rail */}
      <div className="grid grid-cols-1 gap-xl lg:grid-cols-2">
        <section className="flex flex-col gap-md">
          <div className="flex items-center gap-xs">
            <h2 className="text-headline-sm font-semibold text-on-surface">Pending Invitations</h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-on-error">
                {pending.length}
              </span>
            )}
          </div>
          <ActionBanner tone="error" message={invitations.actionError} onDismiss={invitations.dismissError} />
          <ActionBanner tone="success" message={invitations.actionMessage} onDismiss={invitations.dismissMessage} />
          {pending.length > 0 ? (
            <div className="flex flex-col gap-sm">
              {pending.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  busy={invitations.busy}
                  onRespond={(accept) => invitations.respond(inv.id, accept)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon="mark_email_read" title="No pending invitations" />
          )}
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm font-semibold text-on-surface">Completed Projects</h2>
          {completed.length > 0 ? (
            <div className="flex flex-col gap-sm">
              {completed.map((p) => (
                <CompletedRow key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <EmptyState icon="task_alt" title="No completed projects yet" />
          )}
        </section>
      </div>
    </div>
  )
}

function ActiveProjectCard({ project }: { project: Project }) {
  const h = health(project)
  return (
    <Card className="group flex flex-col transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="mb-sm flex items-start justify-between">
        <Badge tone={h.tone} className="text-[10px] font-bold uppercase tracking-wider">
          {h.label}
        </Badge>
      </div>

      <h3 className="mb-1 text-headline-sm font-semibold text-on-surface">{project.title}</h3>
      <p className="mb-md text-body-md text-on-surface-variant">{project.summary}</p>

      <div className="mb-md">
        <div className="mb-1 flex items-center justify-between text-label-md">
          <span className="text-on-surface-variant">{currentPhase(project)}</span>
          <span className="font-bold text-on-surface">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} className="h-1.5" indicatorClassName={h.indicator} />
        <div className="mt-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">{h.icon}</span>
          <span className="text-label-md text-on-surface-variant">Next: {nextAction(project)}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
          {project.members.slice(0, 3).map((m) => (
            <Avatar key={m.id} initials={m.avatarInitials} size="sm" className="ring-2 ring-surface-container-lowest" />
          ))}
          {project.members.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant ring-2 ring-surface-container-lowest">
              +{project.members.length - 3}
            </span>
          )}
        </div>
        <Link
          to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: project.id })}
          className="flex items-center gap-xs text-body-md font-bold text-secondary transition-all hover:gap-sm"
        >
          Open Workspace
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </Card>
  )
}

interface InvitationRowProps {
  invitation: Invitation
  busy: boolean
  onRespond: (accept: boolean) => void
}

function InvitationRow({ invitation, busy, onRespond }: InvitationRowProps) {
  return (
    <Card className="flex items-center justify-between gap-md">
      <div className="flex min-w-0 items-center gap-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary-container/25 text-secondary">
          <span className="material-symbols-outlined" aria-hidden="true">psychology</span>
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-headline-sm font-semibold text-on-surface">{invitation.projectTitle}</h4>
          <p className="text-body-md text-on-surface-variant">
            Invited by <span className="font-semibold text-on-surface">{invitation.invitedBy}</span> ·{' '}
            {invitation.role}
          </p>
          {invitation.problemId && (
            <Link
              to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: invitation.problemId })}
              className="text-label-md font-medium text-secondary hover:underline"
            >
              Read the problem brief
            </Link>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-xs">
        <Button variant="ghost" size="sm" className="h-9 px-4" disabled={busy} onClick={() => onRespond(false)}>
          Reject
        </Button>
        <Button size="sm" className="h-9 px-4" disabled={busy} onClick={() => onRespond(true)}>
          Accept
        </Button>
      </div>
    </Card>
  )
}

function CompletedRow({ project }: { project: Project }) {
  return (
    <Card className="flex items-center justify-between gap-md">
      <div className="flex min-w-0 items-center gap-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">
            check_circle
          </span>
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-headline-sm font-semibold text-on-surface">{project.title}</h4>
          <span className="text-label-md text-on-surface-variant">Completed {completedOn(project)}</span>
        </div>
      </div>
      <Link
        to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' })}
        className="flex shrink-0 items-center gap-xs text-body-md font-semibold text-on-surface-variant transition-colors hover:text-primary"
      >
        View in Portfolio
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
      </Link>
    </Card>
  )
}
