import { RoleLayout } from '@/layouts/RoleLayout'
import { STUDENT_NAV } from '@/constants/navigation'

export function StudentLayout() {
  return <RoleLayout role="student" items={STUDENT_NAV} />
}
