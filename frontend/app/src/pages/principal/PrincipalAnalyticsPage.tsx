/** Institution analytics. Innovation KPIs and trend/distribution charts. */
import { useAsync } from '@/hooks/useAsync'
import { dashboardService } from '@/services/catalog.service'
import type { DashboardStats, NameValue, TrendPoint } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { MiniBarChart } from '@/components/common/MiniBarChart'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

export function PrincipalAnalyticsPage() {
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('principal'))
  const trend = useAsync<TrendPoint[]>(() => dashboardService.creditTrend())
  const distribution = useAsync<NameValue[]>(() => dashboardService.departmentDistribution())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Institution Analytics" subtitle="Trends driving innovation across the campus." />

      {stats.loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {stats.data?.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      <div className="grid gap-lg lg:grid-cols-2">
        <Card>
          <h2 className="mb-md text-base font-semibold text-on-surface">Credit growth (campus)</h2>
          {trend.data ? <MiniBarChart data={trend.data.map((t) => ({ label: t.month, value: t.value }))} /> : <PageLoader />}
        </Card>
        <Card>
          <h2 className="mb-md text-base font-semibold text-on-surface">Projects by department</h2>
          {distribution.data ? <MiniBarChart data={distribution.data} /> : <PageLoader />}
        </Card>
      </div>
    </div>
  )
}
