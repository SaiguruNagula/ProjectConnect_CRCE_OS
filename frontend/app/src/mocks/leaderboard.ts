import type { LeaderboardEntry } from '@/types/domain'

export const MOCK_STUDENT_LEADERBOARD: LeaderboardEntry[] = [
  { id: 's1', rank: 1, name: 'Isha Patil', department: 'Computer Engineering', role: 'student', credits: 4820, avatarInitials: 'IP', rankChange: 2 },
  { id: 's2', rank: 2, name: 'Aarav Sharma', department: 'Computer Engineering', role: 'student', credits: 4560, avatarInitials: 'AS', rankChange: 1 },
  { id: 's3', rank: 3, name: 'Kabir Singh', department: 'Information Technology', role: 'student', credits: 4310, avatarInitials: 'KS', rankChange: -1 },
  { id: 's4', rank: 4, name: 'Meera Joshi', department: 'Electronics Engineering', role: 'student', credits: 3980, avatarInitials: 'MJ', rankChange: 0 },
  { id: 's5', rank: 5, name: 'Riya Verma', department: 'Computer Engineering', role: 'student', credits: 3720, avatarInitials: 'RV', rankChange: 3 },
  { id: 's6', rank: 6, name: 'Dev Kapoor', department: 'Mechanical Engineering', role: 'student', credits: 3540, avatarInitials: 'DK', rankChange: -2 },
  { id: 's7', rank: 7, name: 'Ananya Rao', department: 'Information Technology', role: 'student', credits: 3300, avatarInitials: 'AR', rankChange: 1 },
  { id: 's8', rank: 8, name: 'Vivaan Shah', department: 'Electronics Engineering', role: 'student', credits: 3110, avatarInitials: 'VS', rankChange: 0 },
]

export const MOCK_FACULTY_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'f1', rank: 1, name: 'Dr. Neha Kulkarni', department: 'Computer Engineering', role: 'faculty', credits: 6120, avatarInitials: 'NK', rankChange: 0 },
  { id: 'f2', rank: 2, name: 'Dr. Priya Nair', department: 'Electronics Engineering', role: 'faculty', credits: 5740, avatarInitials: 'PN', rankChange: 1 },
  { id: 'f3', rank: 3, name: 'Dr. Sameer Deshpande', department: 'Information Technology', role: 'faculty', credits: 5390, avatarInitials: 'SD', rankChange: -1 },
  { id: 'f4', rank: 4, name: 'Dr. Anil Rao', department: 'Mechanical Engineering', role: 'faculty', credits: 4980, avatarInitials: 'AR', rankChange: 2 },
  { id: 'f5', rank: 5, name: 'Dr. Kavita Menon', department: 'Computer Engineering', role: 'faculty', credits: 4610, avatarInitials: 'KM', rankChange: 0 },
]
