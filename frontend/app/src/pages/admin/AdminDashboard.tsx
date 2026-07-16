/** Admin dashboard. Platform stats, department distribution, recent activity. */
import { useAsync } from '@/hooks/useAsync'
import { dashboardService } from '@/services/catalog.service'
import type { DashboardStats, NameValue, Activity } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { MiniBarChart } from '@/components/common/MiniBarChart'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

export function AdminDashboard() {
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('admin'))
  const distribution = useAsync<NameValue[]>(() => dashboardService.departmentDistribution())
  const activity = useAsync<Activity[]>(() => dashboardService.activity())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Platform Mission Control" subtitle="Institution-wide platform health at a glance." />

      {stats.loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {stats.data?.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      <div className="grid gap-lg lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-md text-base font-semibold text-on-surface">Projects by department</h2>
          {distribution.data ? <MiniBarChart data={distribution.data} /> : <PageLoader />}
        </Card>
        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Recent activity</h2>
          {activity.data?.slice(0, 6).map((a) => (
            <p key={a.id} className="text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">{a.actor}</span> {a.action}{' '}
              <span className="font-medium text-on-surface">{a.target}</span>
            </p>
          ))}
        </Card>
      </div>
    </div>
  )
}
