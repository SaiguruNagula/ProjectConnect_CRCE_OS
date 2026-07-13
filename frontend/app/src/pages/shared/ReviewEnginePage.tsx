/**
 * Review Engine. Lists submissions and the scoring rubric. Serves the shared
 * /review route and the faculty /faculty/review route — faculty see
 * approve/reject actions. One implementation, role-aware via useRole.
 */
import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useRole } from '@/contexts/RoleContext'
import { reviewsService } from '@/services/catalog.service'
import type { ReviewSubmission, ReviewStatus, RubricCriterion } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeProps } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS_TONE: Record<ReviewStatus, BadgeProps['tone']> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}

export function ReviewEnginePage() {
  const { role } = useRole()
  const isFaculty = role === 'faculty'
  const submissions = useAsync<ReviewSubmission[]>(() => reviewsService.list())
  const rubric = useAsync<RubricCriterion[]>(() => reviewsService.rubric())
  const [decisions, setDecisions] = useState<Record<string, ReviewStatus>>({})

  const statusOf = (s: ReviewSubmission): ReviewStatus => decisions[s.id] ?? s.status

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title={isFaculty ? 'Review Dashboard' : 'Review Engine'}
        subtitle="Structured review turns submitted work into verified credits."
      />

      <div className="grid gap-lg lg:grid-cols-3">
        {/* Submissions */}
        <div className="lg:col-span-2">
          {submissions.loading ? (
            <PageLoader />
          ) : submissions.data && submissions.data.length > 0 ? (
            <Card className="p-0">
              <ul className="divide-y divide-outline-variant">
                {submissions.data.map((s) => {
                  const status = statusOf(s)
                  return (
                    <li key={s.id} className="flex flex-col gap-xs px-md py-sm md:flex-row md:items-center">
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-medium text-on-surface">{s.projectTitle}</span>
                        <span className="text-xs text-on-surface-variant">
                          {s.teamName} · {s.milestone} · {s.submittedAt}
                        </span>
                      </span>
                      <div className="flex items-center gap-xs">
                        <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                        {isFaculty && status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => setDecisions((d) => ({ ...d, [s.id]: 'approved' }))}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDecisions((d) => ({ ...d, [s.id]: 'rejected' }))}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : (
            <EmptyState icon="rate_review" title="No submissions to review" />
          )}
        </div>

        {/* Rubric */}
        <Card className="flex h-fit flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Scoring rubric</h2>
          {rubric.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">{c.label}</span>
              <span className="font-medium text-on-surface">/ {c.maxScore}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
