/** User governance. Searchable/filterable user directory table. */
import { useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/catalog.service'
import type { DirectoryUser } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { initials } from '@/mocks/users'

const ROLES = ['student', 'faculty', 'admin', 'principal'] as const

export function AdminUsersPage() {
  const { data, loading } = useAsync<DirectoryUser[]>(() => adminService.users())
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (u) =>
          (u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())) &&
          (role === '' || u.role === role),
      ),
    [data, query, role],
  )

  const columns: Column<DirectoryUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <span className="flex items-center gap-xs">
          <Avatar initials={initials(u.name)} size="sm" />
          <span className="flex flex-col">
            <span className="font-medium">{u.name}</span>
            <span className="text-xs text-on-surface-variant">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <span className="capitalize">{u.role}</span> },
    { key: 'department', header: 'Department' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge tone={u.status === 'active' ? 'success' : 'error'}>{u.status}</Badge>,
    },
  ]

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="User Governance" subtitle="Manage students, faculty and staff." />
      <div className="flex flex-col gap-sm md:flex-row md:items-center">
        <SearchInput placeholder="Search users" className="md:max-w-sm md:flex-1" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select label="Role" allLabel="All roles" options={ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon="group_off" title="No users match your filters" />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} />
      )}
    </div>
  )
}
