import { RoleLayout } from '@/layouts/RoleLayout'
import { FACULTY_NAV } from '@/constants/navigation'

export function FacultyLayout() {
  return <RoleLayout role="faculty" items={FACULTY_NAV} />
}
