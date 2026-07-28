import type { Activity, Deadline, Notification } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'

/** Every notification links back to the module that raised it (see Notification.link). */
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', kind: 'success', title: 'Milestone approved', message: 'Attendance dashboard milestone was approved by Dr. Kulkarni.', timestamp: '2026-07-12T09:30:00Z', read: false, link: buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: 'pr-01' }) },
  { id: 'n2', kind: 'info', title: 'New team invitation', message: 'You were invited to Peer Mentorship Matching Engine.', timestamp: '2026-07-11T14:10:00Z', read: false, link: ROUTES.STUDENT.PROJECTS },
  { id: 'n3', kind: 'warning', title: 'Review due soon', message: 'Energy Dashboard faculty review closes in 3 days.', timestamp: '2026-07-10T08:00:00Z', read: true, link: ROUTES.SHARED.REVIEW_ENGINE },
  { id: 'n4', kind: 'info', title: 'Credits awarded', message: 'You earned 120 credits from a project milestone.', timestamp: '2026-07-05T16:45:00Z', read: true, link: ROUTES.STUDENT.CREDITS },
]

export const MOCK_ACTIVITY: Activity[] = [
  { id: 'a1', actor: 'Dr. Neha Kulkarni', action: 'approved a milestone in', target: 'Smart Attendance System', timestamp: '2026-07-12T09:30:00Z' },
  { id: 'a2', actor: 'Isha Patil', action: 'pushed an update to', target: 'Smart Attendance System', timestamp: '2026-07-12T07:15:00Z' },
  { id: 'a3', actor: 'You', action: 'submitted for review', target: 'Campus Energy Dashboard', timestamp: '2026-07-11T18:40:00Z' },
  { id: 'a4', actor: 'Kabir Singh', action: 'joined', target: 'Smart Attendance System', timestamp: '2026-07-10T11:05:00Z' },
]

export const MOCK_DEADLINES: Deadline[] = [
  { id: 'd1', title: 'Attendance dashboard', due: '2026-07-25', project: 'Smart Attendance System' },
  { id: 'd2', title: 'Faculty review response', due: '2026-07-18', project: 'Campus Energy Dashboard' },
  { id: 'd3', title: 'Pilot preparation', due: '2026-08-15', project: 'Smart Attendance System' },
]
