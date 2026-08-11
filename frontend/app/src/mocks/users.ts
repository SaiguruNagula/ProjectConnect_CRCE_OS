import type { Role, User } from '@/types'

/** One representative demo user per role, used by the demo login. */
export const DEMO_USERS: Record<Role, User> = {
  student: {
    id: 'u-stu-01',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@crce.edu.in',
    role: 'student',
  },
  faculty: {
    id: 'u-fac-01',
    name: 'Dr. Neha Kulkarni',
    email: 'neha.kulkarni@crce.edu.in',
    role: 'faculty',
  },
  admin: {
    id: 'u-adm-01',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@crce.edu.in',
    role: 'admin',
  },
  principal: {
    id: 'u-pri-01',
    name: 'Dr. Srinivasan Iyer',
    email: 'principal@crce.edu.in',
    role: 'principal',
  },
}
