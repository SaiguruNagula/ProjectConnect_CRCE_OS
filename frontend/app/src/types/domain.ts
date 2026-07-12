/**
 * Domain types for the demo. Shaped to mirror DATABASE_SCHEMA.md so mock data
 * can be swapped for real API responses without changing components.
 */
import type { Role } from '@/types'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProblemStatus = 'open' | 'in_progress' | 'closed'
export type ProjectStatus = 'active' | 'in_review' | 'completed'
export type MilestoneStatus = 'pending' | 'in_progress' | 'done'

export interface Problem {
  id: string
  title: string
  summary: string
  department: string
  difficulty: Difficulty
  skills: string[]
  facultyName: string
  teamSize: number
  timelineWeeks: number
  status: ProblemStatus
  bookmarked: boolean
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatarInitials: string
}

export interface Milestone {
  id: string
  title: string
  status: MilestoneStatus
  dueDate: string
}

export interface Project {
  id: string
  title: string
  summary: string
  status: ProjectStatus
  progress: number
  mentorName: string
  members: TeamMember[]
  milestones: Milestone[]
}

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  department: string
  role: Extract<Role, 'student' | 'faculty'>
  credits: number
  avatarInitials: string
  /** Positive = moved up since last snapshot. */
  rankChange: number
}

export interface CreditTransaction {
  id: string
  date: string
  source: string
  points: number
  description: string
}

export interface Certificate {
  id: string
  title: string
  issuer: string
  date: string
}

export interface ResearchItem {
  id: string
  title: string
  venue: string
  year: number
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
}

export interface Portfolio {
  userId: string
  name: string
  headline: string
  department: string
  avatarInitials: string
  totalCredits: number
  skills: string[]
  projects: Project[]
  research: ResearchItem[]
  certificates: Certificate[]
  achievements: string[]
  timeline: TimelineEvent[]
}

export type NotificationKind = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface Activity {
  id: string
  actor: string
  action: string
  target: string
  timestamp: string
}

export interface DashboardStats {
  label: string
  value: string
  delta?: string
  icon: string
}

export interface Deadline {
  id: string
  title: string
  due: string
  project: string
}
