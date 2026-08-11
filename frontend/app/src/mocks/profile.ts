import type { StudentProfile } from '@/types/domain'

/**
 * The editable source of truth for the demo student's identity. The portfolio
 * mock holds only verified/generated data and composes these fields in — so
 * this object is the single place personal information is entered.
 */
export const MOCK_STUDENT_PROFILE: StudentProfile = {
  userId: 'u-stu-01',
  name: 'Aarav Sharma',
  avatarInitials: 'AS',
  headline: 'Final-year Computer Engineering · Full-stack & Applied ML',
  tagline: 'Innovation Champion | Computer Engineering',
  bio: 'Passionate about building scalable campus solutions and open-source contributions. Currently leading the Smart Attendance project.',
  department: 'Computer Engineering',
  batch: '2021-2025 (4th Yr)',
  rollNumber: 'CE21-018',
  pronouns: 'He / Him',
  location: 'Mumbai, IN',
  institutionalEmail: 'aarav.sharma@crce.edu.in',
  github: 'aarav-sharma',
  linkedin: 'aarav-sharma',
  personalSkills: ['UI/UX Design', 'Docker', 'Next.js', 'System Documentation'],
  visibility: { publicProfile: true, showContact: false, showSocials: true },
}
