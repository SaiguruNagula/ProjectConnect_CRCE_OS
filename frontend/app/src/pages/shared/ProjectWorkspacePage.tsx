/**
 * Project Workspace — pixel-ported from the approved Stitch "Project Command
 * Center". Serves the shared /project route (a representative active project)
 * and /student/projects/:id (by id). Five tabs — Overview, Tasks, Files,
 * Meetings, Team — over service-provided data; param-aware, no duplication.
 *
 * Data comes only through the existing service layer (projectsService,
 * dashboardService) — repositories and services are untouched. Tasks and the
 * timeline derive from the project's milestones; Files and Meetings have no
 * data source in the repository and render as static assets for the demo.
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { projectsService, dashboardService } from '@/services/catalog.service'
import type { Activity, Milestone, Project, TeamMember } from '@/types/domain'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import { daysLeft, fmtDate } from '@/utils/date'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'files', label: 'Files' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'team', label: 'Team' },
] as const
type TabValue = (typeof TABS)[number]['value']

/** Kanban columns keyed by milestone status. */
const COLUMNS: { status: Milestone['status']; label: string }[] = [
  { status: 'pending', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

/** Compact relative time, e.g. "4h ago", "2d ago". */
function relTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function ProjectWorkspacePage() {
  const { id } = useParams()
  const loader = useMemo(
    () =>
      id
        ? () => projectsService.get(id)
        : () => projectsService.list().then((list) => list.find((p) => p.status === 'active') ?? list[0] ?? null),
    [id],
  )
  const { data: project, loading, error } = useAsync<Project | null>(loader, [id])
  const { data: activity } = useAsync<Activity[]>(() => dashboardService.activity())
  const [tab, setTab] = useState<TabValue>('overview')

  if (loading) return <PageLoader />
  if (error || !project) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="folder_off" title="Project not found" description={error ?? undefined} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg px-md py-lg md:px-lg">
      {/* Header */}
      <div className="flex items-center gap-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-high text-primary">
          <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
        </span>
        <div className="leading-tight">
          <h1 className="text-headline-sm font-bold tracking-tight text-primary">{project.title}</h1>
          <p className="text-label-md text-on-surface-variant">Mentor · {project.mentorName}</p>
        </div>
      </div>

      {/* Tab bar (underline, scrollable) */}
      <div
        role="tablist"
        aria-label="Project workspace sections"
        className="no-scrollbar -mx-md flex gap-lg overflow-x-auto whitespace-nowrap border-b border-outline-variant/40 px-md"
      >
        {TABS.map((t) => {
          const active = t.value === tab
          return (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={cn(
                'relative h-12 shrink-0 text-body-md font-medium transition-colors',
                active
                  ? 'text-secondary after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-secondary'
                  : 'text-on-surface-variant hover:text-primary',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab project={project} activity={activity ?? []} />}
      {tab === 'tasks' && <TasksTab project={project} />}
      {tab === 'files' && <FilesTab />}
      {tab === 'meetings' && <MeetingsTab />}
      {tab === 'team' && <TeamTab members={project.members} />}
    </div>
  )
}

/* ------------------------------------------------------------------ Overview */

function OverviewTab({ project, activity }: { project: Project; activity: Activity[] }) {
  const done = project.milestones.filter((m) => m.status === 'done').length
  const total = project.milestones.length
  const milestonePct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="grid grid-cols-1 gap-md lg:grid-cols-12">
      {/* Left: health + feedback */}
      <div className="flex flex-col gap-md lg:col-span-8">
        <Card className="flex flex-col gap-md">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-headline-sm font-semibold">Project Health</h3>
              <p className="text-label-md text-on-surface-variant">
                Overall progress based on completed milestones.
              </p>
            </div>
            <span className="text-headline-md font-bold text-secondary">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} className="h-2.5" />
          <div className="flex items-center gap-md rounded-lg bg-surface-container-low p-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">flag</span>
            </span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-label-md font-semibold">Milestones complete</span>
                <span className="text-label-md text-secondary">{done} / {total}</span>
              </div>
              <ProgressBar value={milestonePct} className="h-1.5" />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm font-semibold">Faculty Feedback</h3>
            <Button variant="ghost" size="sm">
              Schedule Sync
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_today</span>
            </Button>
          </div>
          <div className="rounded-lg border-l-4 border-secondary/50 bg-surface-container-low p-sm">
            <div className="mb-xs flex items-start gap-sm">
              <Avatar initials={initials(project.mentorName)} size="sm" />
              <p className="text-body-md italic leading-relaxed text-on-surface-variant">
                Reviewing milestone progress — keep the demo scoped and document edge cases before the next review.
              </p>
            </div>
            <p className="text-right text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
              {project.mentorName}
            </p>
          </div>
        </Card>
      </div>

      {/* Right: timeline + activity */}
      <div className="flex flex-col gap-md lg:col-span-4">
        <Card>
          <h3 className="mb-md text-headline-sm font-semibold">Timeline</h3>
          <Timeline milestones={project.milestones} />
        </Card>
        <Card>
          <h3 className="mb-md text-headline-sm font-semibold">Activity</h3>
          {activity.length > 0 ? (
            <ul className="flex flex-col gap-md">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-sm">
                  <Avatar initials={initials(a.actor)} size="sm" />
                  <div className="text-body-md">
                    <p>
                      <span className="font-semibold text-on-surface">{a.actor}</span>{' '}
                      <span className="text-on-surface-variant">{a.action}</span>{' '}
                      <span className="font-medium text-secondary">{a.target}</span>
                    </p>
                    <p className="text-label-md text-on-surface-variant">{relTime(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-md text-on-surface-variant">No recent activity.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function Timeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="relative flex flex-col">
      <div className="absolute bottom-2 left-2 top-2 w-0.5 bg-outline-variant/30" aria-hidden="true" />
      {milestones.map((m) => {
        const done = m.status === 'done'
        const current = m.status === 'in_progress'
        const days = daysLeft(m.dueDate)
        return (
          <div key={m.id} className="relative flex gap-md pb-md last:pb-0">
            <span
              className={cn(
                'z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                done && 'bg-secondary ring-4 ring-secondary/10',
                current && 'border-2 border-secondary bg-surface-container',
                !done && !current && 'border-2 border-outline-variant bg-surface-container',
              )}
              aria-hidden="true"
            >
              {done && <span className="material-symbols-outlined text-[10px] font-bold text-white">check</span>}
            </span>
            <div>
              <h4 className={cn('text-body-md font-bold', done && 'text-on-surface-variant line-through opacity-60', !done && !current && 'text-on-surface-variant/70')}>
                {m.title}
              </h4>
              <p
                className={cn(
                  'text-label-md',
                  current && days <= 7 ? 'font-medium text-error' : 'text-on-surface-variant/60',
                )}
              >
                {done ? `Finalized ${fmtDate(m.dueDate)}` : current ? `Due ${fmtDate(m.dueDate)} · ${days} days left` : `Tentative ${fmtDate(m.dueDate)}`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------- Tasks */

function TasksTab({ project }: { project: Project }) {
  const byStatus = (status: Milestone['status']) => project.milestones.filter((m) => m.status === status)
  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = byStatus(col.status)
        return (
          <div key={col.status} className={cn('flex flex-col gap-sm', col.status === 'done' && 'opacity-80')}>
            <div className="flex items-center gap-xs px-xs">
              <span className="text-body-md font-semibold">{col.label}</span>
              <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                {items.length}
              </span>
            </div>
            {items.length === 0 ? (
              <p className="px-xs text-label-md text-on-surface-variant">Nothing here.</p>
            ) : (
              items.map((m) => <TaskCard key={m.id} milestone={m} />)
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ milestone: m }: { milestone: Milestone }) {
  const done = m.status === 'done'
  const current = m.status === 'in_progress'
  return (
    <Card
      className={cn(
        'flex flex-col gap-md p-sm shadow-sm transition-colors',
        current && 'border-l-4 border-l-secondary',
        done && 'bg-surface-container-low/50',
        !done && 'hover:border-secondary',
      )}
    >
      <div className="flex items-start justify-between">
        <Badge tone={done ? 'primary' : current ? 'warning' : 'neutral'} className="uppercase">
          {m.status.replace('_', ' ')}
        </Badge>
        <span className="font-mono text-[10px] text-on-surface-variant">#{m.id.toUpperCase()}</span>
      </div>
      <h4 className={cn('text-body-md font-medium', done && 'text-on-surface-variant line-through')}>{m.title}</h4>
      <div className="flex items-center gap-xs text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">event</span>
        {done ? 'Completed' : `Due ${fmtDate(m.dueDate)}`}
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------------- Files */

// ponytail: no file source in the repository (preserve repositories) — static
// project assets for the demo; wire to a documents service when one exists.
const ASSETS = [
  { icon: 'folder', name: 'Documentation', meta: '12 items · 4.2 MB', folder: true },
  { icon: 'folder', name: 'Source Code', meta: '88 items · 1.5 GB', folder: true },
  { icon: 'picture_as_pdf', name: 'Architecture_Draft.pdf', meta: '2.4 MB · 2h ago', folder: false },
]

function FilesTab() {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h3 className="text-headline-sm font-semibold">Project Assets</h3>
        <Button size="sm">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload</span>
          Upload
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        {ASSETS.map((a) => (
          <Card key={a.name} className="flex items-center gap-md transition-all hover:border-secondary">
            {a.folder ? (
              <span className="material-symbols-outlined text-display text-secondary-container" aria-hidden="true">
                {a.icon}
              </span>
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-error/5 text-error">
                <span className="material-symbols-outlined" aria-hidden="true">{a.icon}</span>
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-md font-semibold">{a.name}</p>
              <p className="text-label-md text-on-surface-variant">{a.meta}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
              {a.folder ? 'download' : 'more_vert'}
            </span>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Meetings */

function MeetingsTab() {
  return (
    <div className="grid grid-cols-1 gap-md lg:grid-cols-12">
      <div className="flex flex-col gap-md lg:col-span-8">
        <div className="relative overflow-hidden rounded-xl bg-primary p-md text-on-primary md:p-lg">
          <div className="relative z-10">
            <span className="mb-sm inline-block rounded bg-white/20 px-xs py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
              Next Up
            </span>
            <h2 className="mb-xs text-headline-md font-bold">Sprint Review #04</h2>
            <div className="flex flex-wrap items-center gap-md text-label-md text-white/80">
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span> 14:00 Today
              </span>
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">location_on</span> Lab 402
              </span>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-5 h-32 w-32 rounded-full bg-secondary opacity-40 blur-3xl" aria-hidden="true" />
        </div>
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-md">
            <h3 className="text-body-md font-bold">Sync History</h3>
            <span className="text-label-md text-on-surface-variant">Last 30 days</span>
          </div>
          <div className="p-md">
            <div className="mb-xs flex items-start justify-between">
              <h4 className="text-body-md font-semibold">User Experience Workshop</h4>
              <span className="text-label-md text-on-surface-variant">Apr 22</span>
            </div>
            <p className="text-label-md text-on-surface-variant">
              Discussed navigation flow for the student portal; mentors suggested simplifying the attendance log view.
            </p>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-4">
        <Card>
          <h4 className="mb-md text-body-md font-bold">Upcoming</h4>
          <p className="text-body-md text-on-surface-variant">
            Sprint reviews are scheduled with your mentor after each milestone. The next review is highlighted above.
          </p>
        </Card>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- Team */

function TeamTab({ members }: { members: TeamMember[] }) {
  return (
    <Card className="flex flex-col gap-lg">
      <h3 className="text-headline-sm font-semibold">Team</h3>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        {members.map((m, i) => {
          const lead = i === 0 || /lead|captain/i.test(m.role)
          return (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-md rounded-xl border p-md',
                lead ? 'border-secondary/30 bg-secondary/5' : 'border-outline-variant',
              )}
            >
              <div className="relative">
                <Avatar initials={m.avatarInitials} className={lead ? 'ring-2 ring-secondary' : undefined} />
                {lead && (
                  <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-secondary p-0.5 text-white ring-2 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-[10px]" aria-hidden="true">star</span>
                  </span>
                )}
              </div>
              <div>
                <p className="text-body-md font-bold">{m.name}</p>
                <p className={cn('text-label-md', lead ? 'font-medium text-secondary' : 'text-on-surface-variant')}>
                  {lead && i === 0 ? `Captain · ${m.role}` : m.role}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------- helpers */

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}
