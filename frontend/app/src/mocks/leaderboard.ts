import type { LeaderboardEntry } from '@/types/domain'

export const MOCK_STUDENT_LEADERBOARD: LeaderboardEntry[] = [
  { id: 's1', rank: 1, name: 'Isha Patil', department: 'Computer Engineering', role: 'student', credits: 4820, contributions: 12, badge: 'Gold Innovator', avatarInitials: 'IP', rankChange: 2 },
  { id: 's2', rank: 2, name: 'Aarav Sharma', department: 'Computer Engineering', role: 'student', credits: 4560, contributions: 9, badge: 'Builder', avatarInitials: 'AS', rankChange: 1 },
  { id: 's3', rank: 3, name: 'Kabir Singh', department: 'Information Technology', role: 'student', credits: 4310, contributions: 11, badge: 'Problem Solver', avatarInitials: 'KS', rankChange: -1 },
  { id: 's4', rank: 4, name: 'Meera Joshi', department: 'Electronics Engineering', role: 'student', credits: 3980, contributions: 7, badge: 'Builder', avatarInitials: 'MJ', rankChange: 0 },
  { id: 's5', rank: 5, name: 'Riya Verma', department: 'Computer Engineering', role: 'student', credits: 3720, contributions: 5, badge: 'Technician', avatarInitials: 'RV', rankChange: 3 },
  { id: 's6', rank: 6, name: 'Dev Kapoor', department: 'Mechanical Engineering', role: 'student', credits: 3540, contributions: 6, badge: 'Builder', avatarInitials: 'DK', rankChange: -2 },
  { id: 's7', rank: 7, name: 'Ananya Rao', department: 'Information Technology', role: 'student', credits: 3300, contributions: 8, badge: 'Problem Solver', avatarInitials: 'AR', rankChange: 1 },
  { id: 's8', rank: 8, name: 'Vivaan Shah', department: 'Electronics Engineering', role: 'student', credits: 3110, contributions: 4, badge: 'Technician', avatarInitials: 'VS', rankChange: 0 },
]

export const MOCK_FACULTY_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'f1', rank: 1, name: 'Dr. Neha Kulkarni', department: 'Computer Engineering', role: 'faculty', credits: 6120, contributions: 45, badge: 'Innovation Champion', avatarInitials: 'NK', rankChange: 0 },
  { id: 'f2', rank: 2, name: 'Dr. Priya Nair', department: 'Electronics Engineering', role: 'faculty', credits: 5740, contributions: 38, badge: 'Mentor', avatarInitials: 'PN', rankChange: 1 },
  { id: 'f3', rank: 3, name: 'Dr. Sameer Deshpande', department: 'Information Technology', role: 'faculty', credits: 5390, contributions: 32, badge: 'Reviewer', avatarInitials: 'SD', rankChange: -1 },
  { id: 'f4', rank: 4, name: 'Dr. Anil Rao', department: 'Mechanical Engineering', role: 'faculty', credits: 4980, contributions: 25, badge: 'Mentor', avatarInitials: 'AR', rankChange: 2 },
  { id: 'f5', rank: 5, name: 'Dr. Kavita Menon', department: 'Computer Engineering', role: 'faculty', credits: 4610, contributions: 22, badge: 'Reviewer', avatarInitials: 'KM', rankChange: 0 },
]
