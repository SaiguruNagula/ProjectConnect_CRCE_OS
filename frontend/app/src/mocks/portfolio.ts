import type { Portfolio } from '@/types/domain'
import { MOCK_PROJECTS } from '@/mocks/projects'

export const MOCK_PORTFOLIO: Portfolio = {
  userId: 'u-stu-01',
  name: 'Aarav Sharma',
  headline: 'Final-year Computer Engineering · Full-stack & Applied ML',
  tagline: 'Innovation Champion | Computer Engineering',
  bio: 'Passionate about building scalable campus solutions and open-source contributions. Currently leading the Smart Attendance project.',
  department: 'Computer Engineering',
  avatarInitials: 'AS',
  github: 'aarav-sharma',
  linkedin: 'aarav-sharma',
  facultyValidationCount: 6,
  hallOfFame: ['Innovation Champion', 'Top Researcher', 'Hackathon Hero'],
  totalCredits: 2450,
  globalRank: 1,
  verifiedSolutionsCount: 12,
  projectsBuilt: 8,
  skills: ['React', 'Node.js', 'System Architecture', 'UI Design', 'IoT'],
  projects: MOCK_PROJECTS,
  solutions: [
    {
      id: 'sol-1',
      name: 'Smart Canteen Payment',
      description: 'Automated NFC-based wallet system for campus dining.',
      appUrl: '#',
      githubUrl: '#',
    },
    {
      id: 'sol-2',
      name: 'CRCE Library Bot',
      description: 'AI-driven search assistant for library resources.',
      appUrl: '#',
      githubUrl: '#',
    },
  ],
  research: [
    {
      id: 'r1',
      title: 'AI-powered Traffic Management',
      venue: 'IEEE Explorer',
      year: 2024,
      description: 'Published in IEEE Explorer 2024. Focused on dynamic lane switching algorithms.',
      url: '#',
    },
  ],
  hackathons: [
    {
      id: 'hk1',
      title: 'Winner, SIH 2024',
      description: 'National Smart India Hackathon. Developed a disaster management protocol using mesh networking.',
      badge: '1st Place | National',
    },
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
    { id: 't1', date: '2024-08', title: 'Team Captain, Smart Attendance', description: 'Leading a team of 4 engineers for campus-wide deployment.' },
    { id: 't2', date: '2024-06', title: 'Milestone: Alpha Release', description: 'Successfully tested Smart Canteen Payment with 500+ users.' },
    { id: 't3', date: '2024-03', title: 'Credits Awarded: 500', description: 'Achievement unlock for Open Source Contributions to CRCE core.' },
  ],
}
