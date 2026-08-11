import type { Invitation, Project, Team } from '@/types/domain'

/**
 * A project as it is stored. `stage`/`stageStatus` are not stored: the
 * repository joins each project with its submission journey to derive them, the
 * same way the API will.
 */
export type ProjectRecord = Omit<Project, 'stage' | 'stageStatus'>

export const MOCK_PROJECTS: ProjectRecord[] = [
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
      { id: 'u-stu-01', name: 'Aarav Sharma', role: 'Team Lead', avatarInitials: 'AS' },
      { id: 'm2', name: 'Isha Patil', role: 'ML Engineer', avatarInitials: 'IP' },
      { id: 'm3', name: 'Kabir Singh', role: 'Frontend', avatarInitials: 'KS' },
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
  },
  {
    id: 'pr-04',
    title: 'E-Waste Logistics',
    summary: 'Routing optimisation for campus-wide electronic waste collection.',
    status: 'active',
    progress: 10,
    mentorName: 'Dr. Priya Nair',
    members: [{ id: 'm14', name: 'Rohan Iyer', role: 'Team Lead', avatarInitials: 'RI' }],
  },
  {
    id: 'pr-03',
    title: 'Accessible Navigation App',
    summary: 'Wayfinding optimised for students with mobility needs.',
    status: 'completed',
    progress: 100,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-05',
    completedAt: '2026-04-01',
    members: [
      { id: 'm6', name: 'Aarav Sharma', role: 'Team Lead', avatarInitials: 'AS' },
      { id: 'm7', name: 'Riya Verma', role: 'Designer', avatarInitials: 'RV' },
    ],
  },

  /*
   * Competing teams on the same open problem. They exist so the Review Engine
   * has real submissions in every stage queue — faculty compare proposals and
   * pick which ones go to final development.
   */
  {
    id: 'pr-05',
    title: 'NFC Attendance Terminal',
    summary: 'Low-latency NFC check-in for high-density lecture halls.',
    status: 'active',
    progress: 20,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-01',
    teamId: 't-nova',
    members: [
      { id: 'm8', name: 'Meera Joshi', role: 'Backend', avatarInitials: 'MJ' },
      { id: 'm9', name: 'Riya Verma', role: 'Designer', avatarInitials: 'RV' },
    ],
  },
  {
    id: 'pr-06',
    title: 'Offline-First Attendance Ledger',
    summary: 'A resilient attendance ledger that survives network outages.',
    status: 'active',
    progress: 45,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-01',
    teamId: 't-quanta',
    members: [
      { id: 'm10', name: 'Sameer Deshpande', role: 'Team Lead', avatarInitials: 'SD' },
      { id: 'm11', name: 'Anil Rao', role: 'Embedded', avatarInitials: 'AR' },
    ],
  },
  {
    id: 'pr-07',
    title: 'Privacy-Preserving Vision Pipeline',
    summary: 'Attendance from a camera feed that never stores a face.',
    status: 'in_review',
    progress: 95,
    mentorName: 'Dr. Neha Kulkarni',
    problemId: 'p-01',
    teamId: 't-vertex',
    members: [
      { id: 'm12', name: 'Neha Kulkarni', role: 'CV Lead', avatarInitials: 'NK' },
      { id: 'm13', name: 'Tara Menon', role: 'Research', avatarInitials: 'TM' },
    ],
  },
  {
    id: 'pr-08',
    title: 'Hostel Water Usage Monitor',
    summary: 'Per-wing water metering to find leaks before the bill does.',
    status: 'active',
    progress: 15,
    mentorName: 'Dr. Priya Nair',
    problemId: 'p-02',
    members: [{ id: 'm15', name: 'Tara Menon', role: 'Solo Innovator', avatarInitials: 'TM' }],
  },
]

/**
 * A team as it is stored. `canManage` is not stored: the repository composes it
 * per caller from the team lead, the same way the API will from the auth token.
 */
export type TeamRecord = Omit<Team, 'canManage'>

export const MOCK_TEAMS: TeamRecord[] = [
  {
    id: 't-alpha',
    name: 'Team Alpha',
    problemId: 'p-01',
    pitch: 'A data-driven approach to on-device attendance and edge computing.',
    mine: true,
    leaderId: 'u-stu-01',
    createdAt: '2024-09-12T09:30:00Z',
    status: 'applied',
    openSpots: 1,
    lookingFor: ['UI Designer'],
    pendingInvites: [
      { id: 'ti-01', email: 'devika.rane@crce.edu.in', role: 'UI Designer', invitedAt: '2024-10-02T11:15:00Z' },
    ],
    members: [
      { id: 'u-stu-01', name: 'Aarav Sharma', role: 'Lead Developer', avatarInitials: 'AS' },
      { id: 'm2', name: 'Isha Patil', role: 'ML Engineer', avatarInitials: 'IP' },
      { id: 'm3', name: 'Kabir Singh', role: 'Hardware Research', avatarInitials: 'KS' },
    ],
  },
  {
    id: 't-nova',
    name: 'Team Nova',
    problemId: 'p-01',
    pitch: 'Focusing on low-latency NFC integration for high-density halls.',
    leaderId: 'm8',
    createdAt: '2024-09-18T14:05:00Z',
    status: 'recruiting',
    openSpots: 2,
    lookingFor: ['ML Engineer', 'UI Designer'],
    pendingInvites: [],
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
    leaderId: 'm10',
    createdAt: '2024-09-21T08:40:00Z',
    status: 'recruiting',
    openSpots: 3,
    lookingFor: ['Backend Developer', 'DevOps'],
    pendingInvites: [],
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
    leaderId: 'm12',
    createdAt: '2024-10-01T16:20:00Z',
    status: 'recruiting',
    openSpots: 2,
    lookingFor: ['Computer Vision', 'UI Designer'],
    pendingInvites: [],
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
