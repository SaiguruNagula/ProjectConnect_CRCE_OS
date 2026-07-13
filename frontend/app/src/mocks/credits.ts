import type { CreditTransaction } from '@/types/domain'

export const MOCK_CREDIT_TRANSACTIONS: CreditTransaction[] = [
  { id: 'c1', date: '2026-07-05', source: 'Project Milestone', points: 120, description: 'Attendance dashboard milestone approved' },
  { id: 'c2', date: '2026-06-28', source: 'Faculty Review', points: 80, description: 'Energy Dashboard review — Excellent' },
  { id: 'c3', date: '2026-06-15', source: 'Hackathon', points: 200, description: 'Runner-up, CRCE Innovate 2026' },
  { id: 'c4', date: '2026-06-02', source: 'Mentorship', points: 60, description: 'Mentored 2 junior teammates' },
  { id: 'c5', date: '2026-05-20', source: 'Project Completion', points: 300, description: 'Accessible Navigation App completed' },
  { id: 'c6', date: '2026-05-08', source: 'Research', points: 150, description: 'Paper accepted at student symposium' },
]

export const CREDIT_RULES = [
  { id: 'cr1', source: 'Project Completion', points: 300, description: 'Awarded when a project passes final faculty review.' },
  { id: 'cr2', source: 'Milestone Approved', points: 120, description: 'Per milestone approved by the mentor.' },
  { id: 'cr3', source: 'Faculty Review', points: 80, description: 'Quality-weighted score from a structured review.' },
  { id: 'cr4', source: 'Hackathon', points: 200, description: 'Placement in a recognised hackathon.' },
  { id: 'cr5', source: 'Research Paper', points: 150, description: 'Accepted publication or symposium paper.' },
  { id: 'cr6', source: 'Mentorship', points: 60, description: 'Verified mentoring of junior teammates.' },
]

export const CREDIT_BREAKDOWN = [
  { label: 'Projects', value: 720 },
  { label: 'Reviews', value: 240 },
  { label: 'Hackathons', value: 200 },
  { label: 'Research', value: 150 },
  { label: 'Mentorship', value: 60 },
]
