/**
 * Faculty dashboard. Mentorship stats, pending reviews, and published problems —
 * all via services with loading/empty states.
 */
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService, reviewsService, problemsService } from '@/services/catalog.service'
import type { DashboardStats, ReviewSubmission, Problem } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

export function FacultyDashboard() {
  const { user } = useAuth()
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('faculty'))
  const reviews = useAsync<ReviewSubmission[]>(() => reviewsService.list())
  const problems = useAsync<Problem[]>(() => problemsService.list())

  const pending = (reviews.data ?? []).filter((r) => r.status === 'pending')

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title={`Welcome, ${user?.name ?? 'Faculty'}`}
        subtitle="Mentor teams, review work, and publish new challenges."
        actions={
          <Link to={ROUTES.FACULTY.CREATE_PROBLEM}>
            <Button>Create problem</Button>
          </Link>
        }
      />

      {stats.loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {stats.data?.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      <div className="grid gap-lg lg:grid-cols-2">
        <Card className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-on-surface">Pending reviews</h2>
            <Link to={ROUTES.FACULTY.REVIEWS} className="text-xs font-medium text-secondary hover:underline">
              View all
            </Link>
          </div>
          {pending.length > 0 ? (
            pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="flex flex-col">
                  <span className="text-on-surface">{r.projectTitle}</span>
                  <span className="text-xs text-on-surface-variant">{r.teamName} · {r.milestone}</span>
                </span>
                <Badge tone="warning">pending</Badge>
              </div>
            ))
          ) : (
            <EmptyState icon="task_alt" title="All caught up" />
          )}
        </Card>

        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Published problems</h2>
          {problems.data?.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-on-surface">{p.title}</span>
              <Badge tone={p.status === 'open' ? 'success' : 'neutral'}>{p.status.replace('_', ' ')}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
