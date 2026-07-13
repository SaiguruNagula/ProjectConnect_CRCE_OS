/** Reusable problem card used by Open Problems and Innovation Hub. */
import { Link } from 'react-router-dom'
import type { Problem } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const DIFFICULTY_TONE = {
  Beginner: 'success',
  Intermediate: 'warning',
  Advanced: 'error',
} as const

export function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <h3 className="text-base font-semibold text-on-surface">{problem.title}</h3>
        <span
          className="material-symbols-outlined text-[20px] text-on-surface-variant"
          aria-hidden="true"
        >
          {problem.bookmarked ? 'bookmark' : 'bookmark_border'}
        </span>
      </div>
      <p className="line-clamp-2 text-sm text-on-surface-variant">{problem.summary}</p>
      <div className="flex flex-wrap gap-base">
        <Badge tone={DIFFICULTY_TONE[problem.difficulty]}>{problem.difficulty}</Badge>
        <Badge>{problem.department}</Badge>
      </div>
      <div className="flex flex-wrap gap-base">
        {problem.skills.map((skill) => (
          <span key={skill} className="rounded bg-surface-container-high px-xs py-base text-xs text-on-surface-variant">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-sm text-xs text-on-surface-variant">
        <span className="flex items-center gap-base">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            person
          </span>
          {problem.facultyName}
        </span>
        <Link
          to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problem.id })}
          className="font-medium text-secondary hover:underline"
        >
          View details
        </Link>
      </div>
    </Card>
  )
}
