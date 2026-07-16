import type { CreditCategory, CreditPipelineItem, CreditSummary, CreditTransaction } from '@/types/domain'

export const MOCK_CREDIT_TRANSACTIONS: CreditTransaction[] = [
  { id: 'c1', date: '2026-07-14', source: 'Faculty Approved', points: 20, description: 'Smart Attendance Prototype', context: 'Dept. of Technology' },
  { id: 'c2', date: '2026-07-12', source: 'Innovation Contribution', points: 10, description: 'Open Problem Submission', context: 'Research Lab' },
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

/** Engine-computed summary (balances, level, milestone progress). */
export const CREDIT_SUMMARY: CreditSummary = {
  engineVersion: 'V4.2',
  total: 320,
  level: 4,
  levelName: 'Innovator',
  nextLevelName: 'Mastership',
  nextMilestone: 400,
  creditsToNext: 80,
  pctToNext: 80,
  current: 320,
  pending: 35,
  locked: 20,
  lifetime: 540,
}

/** Current-cycle credits grouped by category (sums to {@link CREDIT_SUMMARY} current). */
export const CREDIT_CATEGORIES: CreditCategory[] = [
  { label: 'Projects', value: 120, icon: 'code' },
  { label: 'Innovation', value: 85, icon: 'lightbulb' },
  { label: 'Competitions', value: 60, icon: 'emoji_events' },
  { label: 'Campus', value: 55, icon: 'location_city' },
]

/** Submissions awaiting credit awards. */
export const CREDIT_PIPELINE: CreditPipelineItem[] = [
  { id: 'pl1', title: 'Milestone 3 Submission', status: 'In Review', detail: 'Faculty Review Pending', potential: 20 },
]
