/** Executive dashboard. Institution KPIs + department performance. Read-only. */
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { dashboardService, adminService } from '@/services/catalog.service'
import type { DashboardStats, Institution } from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

const columns: Column<Institution>[] = [
  { key: 'name', header: 'Department', render: (i) => <span className="font-medium">{i.name}</span> },
  { key: 'projects', header: 'Projects', align: 'right' },
  { key: 'faculty', header: 'Faculty', align: 'right' },
  { key: 'students', header: 'Students', align: 'right' },
]

export function PrincipalDashboard() {
  const stats = useAsync<DashboardStats[]>(() => dashboardService.stats('principal'))
  const institutions = useAsync<Institution[]>(() => adminService.institutions())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader
        title="Executive Summary"
        subtitle="Institution-wide innovation health."
        actions={
          <Link to={ROUTES.PRINCIPAL.ANALYTICS}>
            <Button variant="outline">View analytics</Button>
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
      <div className="flex flex-col gap-sm">
        <h2 className="text-base font-semibold text-on-surface">Department performance</h2>
        {institutions.loading ? <PageLoader /> : <DataTable columns={columns} rows={institutions.data ?? []} rowKey={(i) => i.id} />}
      </div>
    </div>
  )
}
