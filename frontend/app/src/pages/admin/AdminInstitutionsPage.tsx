/** Institution management. Department overview table. */
import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/catalog.service'
import type { Institution } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

const columns: Column<Institution>[] = [
  { key: 'name', header: 'Department', render: (i) => <span className="font-medium">{i.name}</span> },
  { key: 'students', header: 'Students', align: 'right' },
  { key: 'faculty', header: 'Faculty', align: 'right' },
  { key: 'projects', header: 'Projects', align: 'right' },
]

export function AdminInstitutionsPage() {
  const { data, loading } = useAsync<Institution[]>(() => adminService.institutions())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Institution Management" subtitle="Departments and their innovation footprint." />
      {loading ? <PageLoader /> : <DataTable columns={columns} rows={data ?? []} rowKey={(i) => i.id} />}
    </div>
  )
}
