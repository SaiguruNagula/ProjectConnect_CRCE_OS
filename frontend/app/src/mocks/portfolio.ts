import type { Portfolio } from '@/types/domain'
import { MOCK_PROJECTS } from '@/mocks/projects'

export const MOCK_PORTFOLIO: Portfolio = {
  userId: 'u-stu-01',
  name: 'Aarav Sharma',
  headline: 'Final-year Computer Engineering · Full-stack & Applied ML',
  department: 'Computer Engineering',
  avatarInitials: 'AS',
  totalCredits: 4560,
  skills: ['React', 'TypeScript', 'Python', 'Computer Vision', 'PostgreSQL', 'Node.js', 'Docker'],
  projects: MOCK_PROJECTS,
  research: [
    { id: 'r1', title: 'Edge-based Attendance with Lightweight CNNs', venue: 'CRCE Student Research Symposium', year: 2026 },
  ],
  certificates: [
    { id: 'ct1', title: 'Deep Learning Specialization', issuer: 'Coursera', date: '2025-11' },
    { id: 'ct2', title: 'AWS Cloud Practitioner', issuer: 'Amazon', date: '2025-08' },
  ],
  achievements: [
    'Runner-up, CRCE Innovate 2026',
    'Top 2% on the student leaderboard',
    'Mentored 4 junior students',
  ],
  timeline: [
    { id: 't1', date: '2026-06', title: 'Runner-up at CRCE Innovate', description: 'Smart Attendance System recognised for on-device efficiency.' },
    { id: 't2', date: '2026-04', title: 'Completed Accessible Navigation App', description: 'Shipped a wayfinding app for students with mobility needs.' },
    { id: 't3', date: '2025-12', title: 'Joined the Innovation Hub', description: 'Started contributing to open campus problems.' },
  ],
}
