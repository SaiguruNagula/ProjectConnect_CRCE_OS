import type { Invitation, Project, Team } from '@/types/domain'

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'pr-01',
    title: 'Smart Attendance System',
    summary: 'On-device face recognition for automated lecture attendance.',
    status: 'active',
    progress: 65,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-01',
    teamId: 't-alpha',
    members: [
      { id: 'm1', name: 'Aarav Sharma', role: 'Team Lead', avatarInitials: 'AS' },
      { id: 'm2', name: 'Isha Patil', role: 'ML Engineer', avatarInitials: 'IP' },
      { id: 'm3', name: 'Kabir Singh', role: 'Frontend', avatarInitials: 'KS' },
    ],
    milestones: [
      { id: 'ms1', title: 'Dataset & model selection', status: 'done', dueDate: '2026-05-20' },
      { id: 'ms2', title: 'On-device inference prototype', status: 'done', dueDate: '2026-06-10' },
      { id: 'ms3', title: 'Attendance dashboard', status: 'in_progress', dueDate: '2026-07-25' },
      { id: 'ms4', title: 'Pilot in 2 classrooms', status: 'pending', dueDate: '2026-08-15' },
    ],
  },
  {
    id: 'pr-02',
    title: 'Campus Energy Dashboard',
    summary: 'Real-time electricity monitoring across campus blocks.',
    status: 'in_review',
    progress: 90,
    mentorName: 'Dr. Priya Nair',
    problemId: 'p-02',
    members: [
      { id: 'm4', name: 'Aarav Sharma', role: 'Backend', avatarInitials: 'AS' },
      { id: 'm5', name: 'Meera Joshi', role: 'IoT', avatarInitials: 'MJ' },
    ],
    milestones: [
      { id: 'ms5', title: 'Sensor integration', status: 'done', dueDate: '2026-04-30' },
      { id: 'ms6', title: 'Live dashboard', status: 'done', dueDate: '2026-06-05' },
      { id: 'ms7', title: 'Faculty review', status: 'in_progress', dueDate: '2026-07-18' },
    ],
  },
  {
    id: 'pr-04',
    title: 'E-Waste Logistics',
    summary: 'Routing optimisation for campus-wide electronic waste collection.',
    status: 'active',
    progress: 10,
    mentorName: 'Dr. Priya Nair',
    members: [{ id: 'm14', name: 'Rohan Iyer', role: 'Team Lead', avatarInitials: 'RI' }],
    milestones: [
      { id: 'ms11', title: 'Draft proposal', status: 'in_progress', dueDate: '2026-08-05' },
      { id: 'ms12', title: 'Finalise proposal', status: 'pending', dueDate: '2026-08-20' },
    ],
  },
  {
    id: 'pr-03',
    title: 'Accessible Navigation App',
    summary: 'Wayfinding optimised for students with mobility needs.',
    status: 'completed',
    progress: 100,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-05',
    members: [
      { id: 'm6', name: 'Aarav Sharma', role: 'Team Lead', avatarInitials: 'AS' },
      { id: 'm7', name: 'Riya Verma', role: 'Designer', avatarInitials: 'RV' },
    ],
    milestones: [
      { id: 'ms8', title: 'Accessibility audit', status: 'done', dueDate: '2026-02-10' },
      { id: 'ms9', title: 'Route engine', status: 'done', dueDate: '2026-03-15' },
      { id: 'ms10', title: 'Final review', status: 'done', dueDate: '2026-04-01' },
    ],
  },
]

export const MOCK_TEAMS: Team[] = [
  {
    id: 't-alpha',
    name: 'Team Alpha',
    problemId: 'p-01',
    pitch: 'A data-driven approach to on-device attendance and edge computing.',
    mine: true,
    openSpots: 1,
    lookingFor: ['UI Designer'],
    members: [
      { id: 'm1', name: 'Aarav Sharma', role: 'Lead Developer', avatarInitials: 'AS' },
      { id: 'm2', name: 'Isha Patil', role: 'ML Engineer', avatarInitials: 'IP' },
      { id: 'm3', name: 'Kabir Singh', role: 'Hardware Research', avatarInitials: 'KS' },
    ],
  },
  {
    id: 't-nova',
    name: 'Team Nova',
    problemId: 'p-01',
    pitch: 'Focusing on low-latency NFC integration for high-density halls.',
    openSpots: 2,
    lookingFor: ['ML Engineer', 'UI Designer'],
    members: [
      { id: 'm8', name: 'Meera Joshi', role: 'Backend', avatarInitials: 'MJ' },
      { id: 'm9', name: 'Riya Verma', role: 'Designer', avatarInitials: 'RV' },
    ],
  },
  {
    id: 't-quanta',
    name: 'Team Quanta',
    problemId: 'p-01',
    pitch: 'Offline-first sync and a resilient attendance ledger.',
    openSpots: 3,
    lookingFor: ['Backend Developer', 'DevOps'],
    members: [
      { id: 'm10', name: 'Sameer Deshpande', role: 'Team Lead', avatarInitials: 'SD' },
      { id: 'm11', name: 'Anil Rao', role: 'Embedded', avatarInitials: 'AR' },
    ],
  },
  {
    id: 't-vertex',
    name: 'Team Vertex',
    problemId: 'p-01',
    pitch: 'Computer-vision pipeline with privacy-preserving inference.',
    openSpots: 2,
    lookingFor: ['Computer Vision', 'UI Designer'],
    members: [
      { id: 'm12', name: 'Neha Kulkarni', role: 'CV Lead', avatarInitials: 'NK' },
      { id: 'm13', name: 'Tara Menon', role: 'Research', avatarInitials: 'TM' },
    ],
  },
]

export const PENDING_INVITATIONS: Invitation[] = [
  {
    id: 'inv-01',
    projectTitle: 'Peer Mentorship Matching Engine',
    invitedBy: 'Sameer Deshpande',
    role: 'Backend Developer',
    teamId: 't-mentor',
    problemId: 'p-03',
  },
  {
    id: 'inv-02',
    projectTitle: 'Low-Cost Water Quality Sensor',
    invitedBy: 'Anil Rao',
    role: 'Embedded Engineer',
    teamId: 't-hydro',
    problemId: 'p-04',
  },
]
