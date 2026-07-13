/** Reusable project card used by Solutions Hub, My Projects and Portfolio. */
import { Link } from 'react-router-dom'
import type { Project, ProjectStatus } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeProps } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'

const STATUS: Record<ProjectStatus, { label: string; tone: BadgeProps['tone'] }> = {
  active: { label: 'Active', tone: 'primary' },
  in_review: { label: 'In Review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}

export function ProjectCard({ project }: { project: Project }) {
  const status = STATUS[project.status]
  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <h3 className="text-base font-semibold text-on-surface">{project.title}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="line-clamp-2 text-sm text-on-surface-variant">{project.summary}</p>

      <div className="flex flex-col gap-base">
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-sm">
        <div className="flex -space-x-2">
          {project.members.slice(0, 4).map((m) => (
            <Avatar key={m.id} initials={m.avatarInitials} size="sm" className="ring-2 ring-surface-container-lowest" />
          ))}
        </div>
        <Link
          to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: project.id })}
          className="text-xs font-medium text-secondary hover:underline"
        >
          Open workspace
        </Link>
      </div>
    </Card>
  )
}
