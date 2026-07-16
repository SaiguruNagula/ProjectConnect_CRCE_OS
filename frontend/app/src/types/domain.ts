/**
 * Domain types for the demo. Shaped to mirror DATABASE_SCHEMA.md so mock data
 * can be swapped for real API responses without changing components.
 */
import type { Role } from '@/types'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProblemStatus = 'open' | 'in_progress' | 'closed'
export type ProjectStatus = 'active' | 'in_review' | 'completed'
export type MilestoneStatus = 'pending' | 'in_progress' | 'done'

/** Reference material attached to a problem (mirrors problem_resources). */
export interface ProblemAttachment {
  name: string
  /** Short type label shown on the chip, e.g. 'PDF', 'Dataset', 'PPT'. */
  type: string
  url: string
}

/** A phase in the problem's structured timeline. */
export interface ProblemMilestone {
  label: string
  /** Human-readable date range, e.g. 'Nov 01 - Nov 15, 2026'. */
  date: string
  /** Whether this phase has already elapsed. */
  done: boolean
}

export interface Problem {
  id: string
  title: string
  summary: string
  department: string
  difficulty: Difficulty
  skills: string[]
  facultyName: string
  teamSize: number
  /** Members already on the team, out of {@link teamSize}. */
  currentTeamCount: number
  timelineWeeks: number
  /** Credits awarded on completion (display only; Credit Engine is source of truth). */
  creditReward: number
  /** Students who have applied to join. */
  applicantsCount: number
  /** ISO date the problem closes; drives the "days left" indicator. */
  endDate: string
  attachments: ProblemAttachment[]
  timeline: ProblemMilestone[]
  status: ProblemStatus
  bookmarked: boolean
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatarInitials: string
}

/** A team students can join or apply with (mirrors the teams table). */
export interface Team {
  id: string
  name: string
  /** One-line pitch shown on the team card. */
  pitch: string
  members: TeamMember[]
  /** Remaining open slots. */
  openSpots: number
  /** Roles/skills the team still needs — powers the discovery filters. */
  lookingFor: string[]
  /** The current student's own team (drives the member list + apply-as-team). */
  mine?: boolean
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
  /** Optional secondary context, e.g. 'Dept. of Technology'. */
  context?: string
}

/**
 * Credit Engine summary — the engine is the source of truth (DECISIONS.md §10),
 * so level, progress and balances are computed there, never in the UI.
 */
export interface CreditSummary {
  /** Engine version label, e.g. 'V4.2'. */
  engineVersion: string
  total: number
  level: number
  levelName: string
  /** Tier reached at the next milestone, e.g. 'Mastership'. */
  nextLevelName: string
  /** Credit total for the next milestone, e.g. 400. */
  nextMilestone: number
  creditsToNext: number
  /** Percentage progress toward the next milestone (0–100). */
  pctToNext: number
  current: number
  pending: number
  locked: number
  lifetime: number
}

/** A credit category tally with its display icon. */
export interface CreditCategory {
  label: string
  value: number
  icon: string
}

/** A submission awaiting credits in the pipeline. */
export interface CreditPipelineItem {
  id: string
  title: string
  /** Human status, e.g. 'In Review'. */
  status: string
  detail: string
  /** Credits that will be awarded on approval. */
  potential: number
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
  /** Optional abstract/summary line. */
  description?: string
  /** Optional publication link. */
  url?: string
}

/** A deployed solution shown on a portfolio. */
export interface PortfolioSolution {
  id: string
  name: string
  description: string
  appUrl?: string
  githubUrl?: string
}

/** A hackathon result shown on a portfolio. */
export interface PortfolioHackathon {
  id: string
  title: string
  description: string
  /** Placement badge, e.g. '1st Place | National'. */
  badge: string
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
  /** Short role/identity line, e.g. 'Innovation Champion | Computer Engineering'. */
  tagline: string
  /** One-paragraph bio. */
  bio: string
  department: string
  avatarInitials: string
  github?: string
  linkedin?: string
  /** Number of faculty mentors who verified this portfolio. */
  facultyValidationCount: number
  /** Hall-of-fame badge labels, e.g. 'Innovation Champion'. */
  hallOfFame: string[]
  totalCredits: number
  globalRank: number
  verifiedSolutionsCount: number
  projectsBuilt: number
  skills: string[]
  projects: Project[]
  solutions: PortfolioSolution[]
  research: ResearchItem[]
  hackathons: PortfolioHackathon[]
  certificates: Certificate[]
  achievements: string[]
  timeline: TimelineEvent[]
}

export type ReviewStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'changes_requested'

/** An artifact submitted for review (mirrors submission_files). */
export interface ReviewAttachment {
  id: string
  name: string
  /** File kind label shown on the row, e.g. 'PDF', 'ZIP'. */
  kind: string
  /** Human-readable size, e.g. '4.2 MB'. */
  size: string
  updatedAt: string
}

/** A faculty comment on a submission (mirrors review_comments). */
export interface ReviewComment {
  id: string
  author: string
  authorInitials: string
  text: string
  timestamp: string
  /** Review phase the comment belongs to, e.g. 'Phase 3 Review'. */
  phase: string
}

/** A past evaluation in the submission's history (mirrors review_events). */
export interface ReviewHistoryEntry {
  id: string
  title: string
  submittedAt: string
  /** Short outcome note, e.g. '4.5/5.0 Rating' or 'Complete Docs'. */
  note: string
  status: ReviewStatus
}

export interface ReviewSubmission {
  id: string
  projectTitle: string
  teamName: string
  members: TeamMember[]
  /** Human milestone label, e.g. 'Core Architecture'. */
  milestone: string
  /** Machine milestone code, e.g. 'MILESTONE_3_PROTOTYPE'. */
  milestoneCode: string
  /** One-line milestone description. */
  milestoneSubtitle: string
  submittedAt: string
  dueDate: string
  status: ReviewStatus
  facultyName: string
  facultyId: string
  /** Credits awarded on approval; null until decided. */
  creditsAwarded: number | null
  /** Ceiling for the credit-award control. */
  creditsMax: number
  attachments: ReviewAttachment[]
  comments: ReviewComment[]
  history: ReviewHistoryEntry[]
  /** Next locked phase label, or null at the final phase. */
  nextStep: string | null
}

/** Aggregate review counts for the faculty dashboard header. */
export interface ReviewStats {
  pending: number
  underReview: number
  completed: number
}

/** Payload a faculty decision posts — shaped for the future review API. */
export interface ReviewDecisionInput {
  submissionId: string
  decision: Extract<ReviewStatus, 'approved' | 'rejected' | 'changes_requested'>
  comment: string
  creditsAwarded: number
}

export interface RubricCriterion {
  id: string
  label: string
  maxScore: number
}

export interface CreditRule {
  id: string
  source: string
  points: number
  description: string
}

export interface DirectoryUser {
  id: string
  name: string
  email: string
  role: Role
  department: string
  status: 'active' | 'suspended'
}

export interface Institution {
  id: string
  name: string
  students: number
  faculty: number
  projects: number
}

export type SolutionStatus = 'live' | 'testing' | 'pilot'

/** A deployed campus solution in the marketplace (mirrors solutions table). */
export interface Solution {
  id: string
  name: string
  icon: string
  status: SolutionStatus
  description: string
  /** Filter category, e.g. 'Campus', 'AI', 'Research'. */
  category: string
  tags: string[]
  /** Meta pair shown on the card footer, e.g. 'Usage' → '1.5k Users'. */
  metaLabel: string
  metaValue: string
  /** Call-to-action label, e.g. 'Open' or 'Join Test'. */
  ctaLabel: string
  /** Featured solutions appear in the Faculty Highlights rail. */
  featured: boolean
  /** Approval line shown on featured cards, e.g. 'Faculty Approved'. */
  highlightTag?: string
}

/** Aggregate marketplace stats for the Solutions hero. */
export interface SolutionStats {
  liveSolutions: number
  contributors: string
  departments: number
  campusUsers: string
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

export interface Invitation {
  id: string
  projectTitle: string
  invitedBy: string
  role: string
}

/** Generic label/value pair for charts and breakdowns. */
export interface NameValue {
  label: string
  value: number
}

export interface TrendPoint {
  month: string
  value: number
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
