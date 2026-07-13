import type { DirectoryUser, Institution } from '@/types/domain'

export const MOCK_DIRECTORY_USERS: DirectoryUser[] = [
  { id: 'u1', name: 'Aarav Sharma', email: 'aarav.sharma@crce.edu.in', role: 'student', department: 'Computer Engineering', status: 'active' },
  { id: 'u2', name: 'Isha Patil', email: 'isha.patil@crce.edu.in', role: 'student', department: 'Computer Engineering', status: 'active' },
  { id: 'u3', name: 'Kabir Singh', email: 'kabir.singh@crce.edu.in', role: 'student', department: 'Information Technology', status: 'active' },
  { id: 'u4', name: 'Dr. Neha Kulkarni', email: 'neha.kulkarni@crce.edu.in', role: 'faculty', department: 'Computer Engineering', status: 'active' },
  { id: 'u5', name: 'Dr. Priya Nair', email: 'priya.nair@crce.edu.in', role: 'faculty', department: 'Electronics Engineering', status: 'active' },
  { id: 'u6', name: 'Rohan Mehta', email: 'rohan.mehta@crce.edu.in', role: 'admin', department: 'Administration', status: 'active' },
  { id: 'u7', name: 'Meera Joshi', email: 'meera.joshi@crce.edu.in', role: 'student', department: 'Electronics Engineering', status: 'suspended' },
  { id: 'u8', name: 'Dr. Anil Rao', email: 'anil.rao@crce.edu.in', role: 'faculty', department: 'Mechanical Engineering', status: 'active' },
]

export const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'd1', name: 'Computer Engineering', students: 420, faculty: 28, projects: 92 },
  { id: 'd2', name: 'Electronics Engineering', students: 310, faculty: 22, projects: 61 },
  { id: 'd3', name: 'Information Technology', students: 360, faculty: 24, projects: 74 },
  { id: 'd4', name: 'Mechanical Engineering', students: 280, faculty: 20, projects: 43 },
]
