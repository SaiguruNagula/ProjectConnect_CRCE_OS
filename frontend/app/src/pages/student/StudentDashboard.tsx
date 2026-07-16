/**
 * Student dashboard. Aggregates read-only data from services (stats, credit
 * trend, activity, deadlines) with loading/empty states. No scoring logic here.
 */
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService } from '@/services/catalog.service'
import { PageHeader } from '@/components/common/PageHeader'
import { MiniBarChart } from '@/components/common/MiniBarChart'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

export function StudentDashboard() {
  const { user } = useAuth()
  const stats = useAsync(() => dashboardService.stats('student'))
  const trend = useAsync(() => dashboardService.creditTrend())
  const activity = useAsync(() => dashboardService.activity())
  const deadlines = useAsync(() => dashboardService.deadlines())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? 'Student'}`}
        subtitle="Here’s what’s happening across your projects."
      />

      {/* Stat tiles */}
      {stats.loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {stats.data?.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      <div className="grid gap-lg lg:grid-cols-3">
        {/* Credit trend */}
        <Card className="lg:col-span-2">
          <h2 className="mb-md text-base font-semibold text-on-surface">Credit growth</h2>
          {trend.data ? <MiniBarChart data={trend.data.map((t) => ({ label: t.month, value: t.value }))} /> : <PageLoader />}
        </Card>

        {/* Deadlines */}
        <Card>
          <h2 className="mb-md text-base font-semibold text-on-surface">Upcoming deadlines</h2>
          {deadlines.data && deadlines.data.length > 0 ? (
            <ul className="flex flex-col gap-sm">
              {deadlines.data.map((d) => (
                <li key={d.id} className="flex items-start gap-xs">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant" aria-hidden="true">
                    event
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm text-on-surface">{d.title}</span>
                    <span className="text-xs text-on-surface-variant">
                      {d.project} · due {d.due}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="event_available" title="No upcoming deadlines" />
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <h2 className="mb-md text-base font-semibold text-on-surface">Recent activity</h2>
        {activity.data && activity.data.length > 0 ? (
          <ul className="flex flex-col divide-y divide-outline-variant">
            {activity.data.map((a) => (
              <li key={a.id} className="flex items-center gap-sm py-sm text-sm">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant" aria-hidden="true">
                  bolt
                </span>
                <span className="text-on-surface">
                  <span className="font-medium">{a.actor}</span>{' '}
                  <span className="text-on-surface-variant">{a.action}</span>{' '}
                  <span className="font-medium">{a.target}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="history" title="No recent activity yet" />
        )}
      </Card>
    </div>
  )
}
