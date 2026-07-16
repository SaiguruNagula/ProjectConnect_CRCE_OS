/**
 * My Projects. Active vs completed tabs + pending invitations. Reuses
 * ProjectCard; data via the projects service.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Invitation, Project } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

export function MyProjectsPage() {
  const projects = useAsync<Project[]>(() => projectsService.list())
  const invitations = useAsync<Invitation[]>(() => projectsService.invitations())
  const [tab, setTab] = useState('active')

  const filtered = useMemo(
    () =>
      (projects.data ?? []).filter((p) =>
        tab === 'active' ? p.status !== 'completed' : p.status === 'completed',
      ),
    [projects.data, tab],
  )

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title="My Projects"
        subtitle="Your active work and completed contributions."
        actions={
          <Link to={ROUTES.SHARED.OPEN_PROBLEMS}>
            <Button>Browse open problems</Button>
          </Link>
        }
      />

      <Tabs
        items={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {projects.loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title={tab === 'active' ? 'No active projects' : 'No completed projects yet'}
          description="Browse open problems to join or start a project."
        />
      ) : (
        <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {invitations.data && invitations.data.length > 0 && (
        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Pending invitations</h2>
          {invitations.data.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between text-sm">
              <span className="text-on-surface">{inv.projectTitle}</span>
              <Link to={ROUTES.SHARED.TEAM_FORMATION} className="text-xs font-medium text-secondary hover:underline">
                Respond
              </Link>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
