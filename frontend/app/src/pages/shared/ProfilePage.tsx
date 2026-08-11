/**
 * Profile. Reused by /student/profile and /faculty/profile — dispatches by role
 * to the dedicated identity hub for each. No duplication: both read the signed-in
 * user and their own profile service/repository.
 */
import { useAuth } from '@/contexts/AuthContext'
import { StudentProfilePage } from '@/pages/student/StudentProfilePage'
import { FacultyProfilePage } from '@/pages/faculty/FacultyProfilePage'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  return user.role === 'faculty' ? <FacultyProfilePage /> : <StudentProfilePage />
}
