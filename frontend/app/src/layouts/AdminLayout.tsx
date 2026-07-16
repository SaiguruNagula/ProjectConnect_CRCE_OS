import { RoleLayout } from '@/layouts/RoleLayout'
import { ADMIN_NAV } from '@/constants/navigation'

export function AdminLayout() {
  return <RoleLayout role="admin" items={ADMIN_NAV} />
}
