import type { ReviewStats, ReviewSubmission, RubricCriterion } from '@/types/domain'

export const MOCK_REVIEWS: ReviewSubmission[] = [
  {
    id: 'rv-01',
    projectTitle: 'Smart Attendance System',
    teamName: 'Team Vision',
    members: [
      { id: 'm1', name: 'Aarav Sharma', role: 'Lead Developer', avatarInitials: 'AS' },
      { id: 'm2', name: 'Isha Patil', role: 'ML Engineer', avatarInitials: 'IP' },
      { id: 'm3', name: 'Kabir Singh', role: 'Frontend', avatarInitials: 'KS' },
      { id: 'm4', name: 'Riya Verma', role: 'Designer', avatarInitials: 'RV' },
      { id: 'm5', name: 'Meera Joshi', role: 'QA', avatarInitials: 'MJ' },
    ],
    milestone: 'Core Architecture',
    milestoneCode: 'MILESTONE_3_PROTOTYPE',
    milestoneSubtitle: 'System Design & DB Schema',
    submittedAt: '2026-07-11',
    dueDate: '2026-07-25',
    status: 'under_review',
    facultyName: 'Dr. Manoj Shah',
    facultyId: 'FAC-772',
    creditsAwarded: null,
    creditsMax: 20,
    attachments: [
      { id: 'af-1', name: 'Research_Paper_Draft_v2.pdf', kind: 'PDF', size: '4.2 MB', updatedAt: '2026-07-11T10:00:00Z' },
      { id: 'af-2', name: 'Source_Code_Archive.zip', kind: 'ZIP', size: '128.5 MB', updatedAt: '2026-07-11T10:05:00Z' },
    ],
    comments: [
      {
        id: 'cm-1',
        author: 'Dr. Manoj Shah',
        authorInitials: 'MS',
        text: 'The database schema looks solid. Focus on the API response times for the next phase.',
        timestamp: '2026-07-12T10:45:00Z',
        phase: 'Phase 3 Review',
      },
    ],
    history: [
      { id: 'hs-1', title: 'Feasibility Study', submittedAt: '2026-05-12', note: '4.5/5.0 Rating', status: 'approved' },
      { id: 'hs-2', title: 'SRS Documentation', submittedAt: '2026-06-28', note: 'Complete Docs', status: 'approved' },
    ],
    nextStep: 'Beta Testing',
  },
  {
    id: 'rv-02',
    projectTitle: 'Campus Energy Dashboard',
    teamName: 'WattWatchers',
    members: [
      { id: 'm6', name: 'Aarav Sharma', role: 'Backend', avatarInitials: 'AS' },
      { id: 'm7', name: 'Meera Joshi', role: 'IoT', avatarInitials: 'MJ' },
    ],
    milestone: 'Live dashboard',
    milestoneCode: 'MILESTONE_2_DESIGN',
    milestoneSubtitle: 'Real-time metering UI',
    submittedAt: '2026-07-10',
    dueDate: '2026-07-24',
    status: 'pending',
    facultyName: 'Dr. Priya Nair',
    facultyId: 'FAC-518',
    creditsAwarded: null,
    creditsMax: 20,
    attachments: [
      { id: 'af-3', name: 'Dashboard_Spec.pdf', kind: 'PDF', size: '2.1 MB', updatedAt: '2026-07-10T09:00:00Z' },
    ],
    comments: [],
    history: [
      { id: 'hs-3', title: 'Sensor Integration', submittedAt: '2026-05-30', note: 'Approved', status: 'approved' },
    ],
    nextStep: 'Faculty Pilot',
  },
  {
    id: 'rv-03',
    projectTitle: 'Peer Mentorship Engine',
    teamName: 'MentorMatch',
    members: [
      { id: 'm8', name: 'Sameer Deshpande', role: 'Team Lead', avatarInitials: 'SD' },
      { id: 'm9', name: 'Tara Menon', role: 'Backend', avatarInitials: 'TM' },
    ],
    milestone: 'Matching algorithm',
    milestoneCode: 'MILESTONE_2_ENGINE',
    milestoneSubtitle: 'Preference-weighted pairing',
    submittedAt: '2026-07-08',
    dueDate: '2026-07-20',
    status: 'approved',
    facultyName: 'Dr. Neha Kulkarni',
    facultyId: 'FAC-441',
    creditsAwarded: 16,
    creditsMax: 20,
    attachments: [
      { id: 'af-4', name: 'Algorithm_Notes.pdf', kind: 'PDF', size: '1.4 MB', updatedAt: '2026-07-08T14:00:00Z' },
    ],
    comments: [
      {
        id: 'cm-2',
        author: 'Dr. Neha Kulkarni',
        authorInitials: 'NK',
        text: 'Strong matching heuristic. Approved for the next phase.',
        timestamp: '2026-07-09T11:20:00Z',
        phase: 'Phase 2 Review',
      },
    ],
    history: [
      { id: 'hs-4', title: 'Problem Framing', submittedAt: '2026-05-18', note: '4.0/5.0 Rating', status: 'approved' },
    ],
    nextStep: 'Pilot Rollout',
  },
  {
    id: 'rv-04',
    projectTitle: 'Water Quality Sensor',
    teamName: 'AquaSense',
    members: [
      { id: 'm10', name: 'Anil Rao', role: 'Embedded', avatarInitials: 'AR' },
      { id: 'm11', name: 'Neha Kulkarni', role: 'Hardware', avatarInitials: 'NK' },
    ],
    milestone: 'Sensor calibration',
    milestoneCode: 'MILESTONE_1_ABSTRACT',
    milestoneSubtitle: 'Turbidity + pH baseline',
    submittedAt: '2026-07-05',
    dueDate: '2026-07-18',
    status: 'changes_requested',
    facultyName: 'Dr. Manoj Shah',
    facultyId: 'FAC-772',
    creditsAwarded: null,
    creditsMax: 20,
    attachments: [
      { id: 'af-5', name: 'Calibration_Report.pdf', kind: 'PDF', size: '3.0 MB', updatedAt: '2026-07-05T16:00:00Z' },
    ],
    comments: [
      {
        id: 'cm-3',
        author: 'Dr. Manoj Shah',
        authorInitials: 'MS',
        text: 'Calibration drift is too high. Re-run against the reference buffer and resubmit.',
        timestamp: '2026-07-06T09:10:00Z',
        phase: 'Phase 1 Review',
      },
    ],
    history: [],
    nextStep: 'Field Testing',
  },
]

/** Aggregate counts across the faculty's whole review load (beyond the visible queue). */
export const REVIEW_STATS: ReviewStats = {
  pending: 12,
  underReview: 5,
  completed: 84,
}

export const REVIEW_RUBRIC: RubricCriterion[] = [
  { id: 'rc1', label: 'Innovation & originality', maxScore: 10 },
  { id: 'rc2', label: 'Technical execution', maxScore: 10 },
  { id: 'rc3', label: 'Documentation quality', maxScore: 5 },
  { id: 'rc4', label: 'Real-world impact', maxScore: 5 },
]
