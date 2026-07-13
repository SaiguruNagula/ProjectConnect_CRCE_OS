/**
 * Project Workspace. Serves the shared /project route (loads a representative
 * active project) and /student/projects/:id (loads by id). Tabs for Overview,
 * Milestones and Team. One implementation, param-aware — no duplication.
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Project } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs } from '@/components/ui/Tabs'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const MILESTONE_ICON = { done: 'check_circle', in_progress: 'pending', pending: 'radio_button_unchecked' } as const

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
  const [tab, setTab] = useState('overview')

  if (loading) return <PageLoader />
  if (error || !project) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="folder_off" title="Project not found" description={error ?? undefined} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title={project.title}
        subtitle={`Mentor: ${project.mentorName}`}
        actions={<Badge tone="primary">{project.progress}% complete</Badge>}
      />

      <Tabs
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'milestones', label: 'Milestones' },
          { value: 'team', label: 'Team' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <Card className="flex flex-col gap-sm">
          <p className="text-sm leading-relaxed text-on-surface-variant">{project.summary}</p>
          <div className="flex flex-col gap-base pt-sm">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Overall progress</span>
              <span>{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        </Card>
      )}

      {tab === 'milestones' && (
        <Card className="p-0">
          <ul className="divide-y divide-outline-variant">
            {project.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-sm px-md py-sm">
                <span className="material-symbols-outlined text-[22px] text-secondary" aria-hidden="true">
                  {MILESTONE_ICON[m.status]}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-on-surface">{m.title}</span>
                  <span className="text-xs text-on-surface-variant">Due {m.dueDate}</span>
                </span>
                <Badge tone={m.status === 'done' ? 'success' : m.status === 'in_progress' ? 'warning' : 'neutral'}>
                  {m.status.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'team' && (
        <Card className="p-0">
          <ul className="divide-y divide-outline-variant">
            {project.members.map((m) => (
              <li key={m.id} className="flex items-center gap-sm px-md py-sm">
                <Avatar initials={m.avatarInitials} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-on-surface">{m.name}</span>
                  <span className="text-xs text-on-surface-variant">{m.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
