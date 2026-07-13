import type { ReviewSubmission, RubricCriterion } from '@/types/domain'

export const MOCK_REVIEWS: ReviewSubmission[] = [
  { id: 'rv-01', projectTitle: 'Smart Attendance System', teamName: 'Team Vision', milestone: 'Attendance dashboard', submittedAt: '2026-07-11', status: 'pending' },
  { id: 'rv-02', projectTitle: 'Campus Energy Dashboard', teamName: 'WattWatchers', milestone: 'Live dashboard', submittedAt: '2026-07-10', status: 'pending' },
  { id: 'rv-03', projectTitle: 'Peer Mentorship Engine', teamName: 'MentorMatch', milestone: 'Matching algorithm', submittedAt: '2026-07-08', status: 'approved' },
  { id: 'rv-04', projectTitle: 'Water Quality Sensor', teamName: 'AquaSense', milestone: 'Sensor calibration', submittedAt: '2026-07-05', status: 'rejected' },
]

export const REVIEW_RUBRIC: RubricCriterion[] = [
  { id: 'rc1', label: 'Innovation & originality', maxScore: 10 },
  { id: 'rc2', label: 'Technical execution', maxScore: 10 },
  { id: 'rc3', label: 'Documentation quality', maxScore: 5 },
  { id: 'rc4', label: 'Real-world impact', maxScore: 5 },
]
