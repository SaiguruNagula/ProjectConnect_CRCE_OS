import { RoleLayout } from '@/layouts/RoleLayout'
import { PRINCIPAL_NAV } from '@/constants/navigation'

export function PrincipalLayout() {
  return <RoleLayout role="principal" items={PRINCIPAL_NAV} />
}
