/**
 * Problem details. Loads one problem by :id via the service and offers the
 * lifecycle entry point (apply -> Team Formation).
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type { Problem } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

export function ProblemDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: problem, loading, error } = useAsync<Problem | null>(() => problemsService.get(id), [id])

  if (loading) return <PageLoader />
  if (error || !problem) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="error" title="Problem not found" description={error ?? 'This problem may have been closed.'} />
      </div>
    )
  }

  const facts: Array<[string, string]> = [
    ['Department', problem.department],
    ['Difficulty', problem.difficulty],
    ['Team size', `${problem.teamSize} members`],
    ['Timeline', `${problem.timelineWeeks} weeks`],
    ['Mentor', problem.facultyName],
    ['Status', problem.status.replace('_', ' ')],
  ]

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title={problem.title}
        subtitle={problem.department}
        actions={
          <Button onClick={() => navigate(ROUTES.SHARED.TEAM_FORMATION)} disabled={problem.status === 'closed'}>
            {problem.status === 'closed' ? 'Closed' : 'Apply with a team'}
          </Button>
        }
      />

      <div className="grid gap-lg lg:grid-cols-3">
        <div className="flex flex-col gap-lg lg:col-span-2">
          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Overview</h2>
            <p className="text-sm leading-relaxed text-on-surface-variant">{problem.summary}</p>
          </Card>
          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Skills required</h2>
            <div className="flex flex-wrap gap-base">
              {problem.skills.map((s) => (
                <Badge key={s} tone="primary">{s}</Badge>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex h-fit flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Details</h2>
          <dl className="flex flex-col divide-y divide-outline-variant">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-xs text-sm">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className="font-medium capitalize text-on-surface">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
