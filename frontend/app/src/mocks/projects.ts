import type { Project } from '@/types/domain'

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'pr-01',
    title: 'Smart Attendance System',
    summary: 'On-device face recognition for automated lecture attendance.',
    status: 'active',
    progress: 65,
    mentorName: 'Dr. Neha Kulkarni',
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
    id: 'pr-03',
    title: 'Accessible Navigation App',
    summary: 'Wayfinding optimised for students with mobility needs.',
    status: 'completed',
    progress: 100,
    mentorName: 'Dr. Neha Kulkarni',
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

export const PENDING_INVITATIONS = [
  {
    id: 'inv-01',
    projectTitle: 'Peer Mentorship Matching Engine',
    invitedBy: 'Sameer Deshpande',
    role: 'Backend Developer',
  },
  {
    id: 'inv-02',
    projectTitle: 'Low-Cost Water Quality Sensor',
    invitedBy: 'Anil Rao',
    role: 'Embedded Engineer',
  },
]
