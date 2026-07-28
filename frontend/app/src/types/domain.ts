/**
 * Domain types for the demo. Shaped to mirror DATABASE_SCHEMA.md so mock data
 * can be swapped for real API responses without changing components.
 */
import type { Role } from '@/types'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProblemStatus = 'open' | 'in_progress' | 'closed'
export type ProjectStatus = 'active' | 'in_review' | 'completed'
export type MilestoneStatus = 'pending' | 'in_progress' | 'done'

/**
 * Request body for POST /api/v1/problems (Faculty Create Problem). This is the
 * create/publish CONTRACT — distinct from the read-model {@link Problem} — so the
 * form can capture richer authoring detail (statement, rationale, tooling, team
 * policy, timeline) that the backend maps onto the problems/problem_tags tables.
 * The mock repository composes a {@link Problem} from this on publish.
 */
export interface CreateProblemInput {
  title: string
  /** Domain / department the challenge belongs to (drives Open Problems filtering). */
  department: string
  /** One-sentence hook shown on problem cards. */
  summary: string
  /** Detailed problem statement (maps to problems.description). */
  statement: string
  /** Rationale: what is wrong with the status quo. */
  currentChallenge?: string
  /** Rationale: what success looks like. */
  expectedImpact?: string
  difficulty: Difficulty
  /** Required skills (maps to problems.required_skills). */
  skills: string[]
  /** Stack / tooling tags (maps to problem_tags). */
  tools?: string[]
  /** Maximum team size (problems.expected_team_size). */
  teamSize: number
  /** Whether a single student may take the challenge solo. */
  allowIndividualEntry: boolean
  /** Registration-opens date, ISO yyyy-mm-dd (problems.start_date). */
  registrationDate: string
  /** Final submission deadline, ISO yyyy-mm-dd (problems.end_date). */
  deadlineDate: string
  /** Base credit reward configured for the challenge. */
  baseCredits: number
  /** Author (problems.created_by) — set from the signed-in faculty, not user-entered. */
  facultyName: string
}

/** A saved-but-unpublished problem, readable back into the authoring form. */
export interface ProblemDraft {
  id: string
  savedAt: string
  input: CreateProblemInput
}

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
  /** Author of the problem — links a problem card back to the faculty who posted it. */
  facultyId?: string
  teamSize: number
  /** Members already on the team, out of {@link teamSize}. */
  currentTeamCount: number
  timelineWeeks: number
  /** Credits awarded on completion (display only; Credit Engine is source of truth). */
  creditReward: number
  /** Students who have applied to join. */
  applicantsCount: number
  /** Solutions submitted against this problem (faculty dashboard metric). */
  solutionsCount?: number
  /** ISO date the problem closes; drives the "days left" indicator. */
  endDate: string
  attachments: ProblemAttachment[]
  timeline: ProblemMilestone[]
  status: ProblemStatus
  bookmarked: boolean
  /**
   * How the signed-in student is participating. Owned by the repository/backend
   * so no page has to track "have I applied?" in local state.
   */
  applicationStatus?: ProblemApplicationStatus
}

/** The signed-in student's relationship to a problem. */
export type ProblemApplicationStatus = 'none' | 'team' | 'solo'

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
  /** The problem this team formed around — the link back to Open Problems. */
  problemId: string
  /** One-line pitch shown on the team card. */
  pitch: string
  members: TeamMember[]
  /** Remaining open slots. */
  openSpots: number
  /** Roles/skills the team still needs — powers the discovery filters. */
  lookingFor: string[]
  /** The current student's own team (drives the member list + apply-as-team). */
  mine?: boolean
  /** Set once the student has requested to join (drives the disabled CTA). */
  joinRequested?: boolean
}

/** Create-team payload — POST /api/v1/teams. */
export interface CreateTeamInput {
  problemId: string
  name: string
  /** The team's pitch/idea. */
  pitch: string
  /** Roles/skills the team is recruiting for. */
  lookingFor: string[]
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
  /** The problem this project was built to solve — links the workspace back to its brief. */
  problemId?: string
  /** The team executing the project. */
  teamId?: string
}

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  department: string
  role: Extract<Role, 'student' | 'faculty'>
  credits: number
  /** Verified contributions — projects shipped (student) / teams mentored (faculty). */
  contributions: number
  /** Recognition tier awarded by the Credit Engine (display only). */
  badge: string
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

/** A verified achievement row on the private identity hub. */
export interface ProfileAchievement {
  /** Material Symbols icon name. */
  icon: string
  title: string
  description: string
  /** Short category label, e.g. 'Verified by Registry'. */
  tag: string
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
  /** Preferred pronouns, e.g. 'He / Him' (private identity hub). */
  pronouns?: string
  /** City/country shown on the identity card. */
  location?: string
  /** Academic batch/year label, e.g. '2021-2025 (3rd Yr)'. */
  batch?: string
  /** Institutional roll number, e.g. 'CS21-042'. */
  rollNumber?: string
  /** Verified institutional email (falls back to the account email). */
  institutionalEmail?: string
  /** Self-declared skills, distinct from the verified {@link skills}. */
  personalSkills?: string[]
  /** Leaderboard percentile label, e.g. 'Top 5%'. */
  rankPercentile?: string
  /** Structured verified achievements for the identity hub. */
  verifiedAchievements?: ProfileAchievement[]
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

/**
 * Portfolio curation the student owns and edits from their own /portfolio/:id.
 * Independent of the Profile (DECISIONS.md): the Portfolio may REFERENCE profile
 * data, but the student decides what the world sees. Empty overrides fall back
 * to the composed profile/verified values, so nothing has to be re-entered.
 */
export interface PortfolioCustomization {
  /** Is the public portfolio live. When false, only the owner (preview) sees it. */
  published: boolean
  /** Portfolio headline; overrides the profile tagline on the public page when non-empty. */
  headline: string
  /** Portfolio introduction; overrides the profile bio on the public page when non-empty. */
  introduction: string
  /** Skills (verified or personal) the student chose to feature. Empty = show all verified. */
  featuredSkills: string[]
  /** Which optional sections appear on the public portfolio. */
  sections: {
    solutions: boolean
    research: boolean
    hackathons: boolean
    timeline: boolean
  }
}

/**
 * Visibility flags the student controls from their profile. The portfolio
 * composition (never the UI) enforces these before exposing data publicly.
 */
export interface ProfileVisibility {
  /** Master switch — is the public portfolio visible at all. */
  publicProfile: boolean
  /** Expose the institutional email on the public portfolio. */
  showContact: boolean
  /** Expose GitHub / LinkedIn links on the public portfolio. */
  showSocials: boolean
}

/**
 * StudentProfile — the single editable source of truth for a student's
 * personal/professional identity (DATABASE_SCHEMA students table). The student
 * owns and edits these fields from /student/profile; the Portfolio view model
 * COMPOSES them (see {@link Portfolio}) rather than storing its own copy, so a
 * profile edit reflects everywhere without duplicate entry.
 */
export interface StudentProfile {
  userId: string
  name: string
  avatarInitials: string
  /** Headline shown under the name, e.g. 'Final-year CE · Full-stack & ML'. */
  headline: string
  /** Short identity line, e.g. 'Innovation Champion | Computer Engineering'. */
  tagline: string
  bio: string
  department: string
  /** Academic batch/year label, e.g. '2021-2025 (4th Yr)'. */
  batch?: string
  /** Institutional roll number, e.g. 'CE21-018'. */
  rollNumber?: string
  pronouns?: string
  location?: string
  /** Institutional email (contact — gated by {@link ProfileVisibility.showContact}). */
  institutionalEmail?: string
  /** GitHub handle (gated by {@link ProfileVisibility.showSocials}). */
  github?: string
  /** LinkedIn handle (gated by {@link ProfileVisibility.showSocials}). */
  linkedin?: string
  /** Self-declared skills (distinct from verified institutional skills). */
  personalSkills: string[]
  visibility: ProfileVisibility
}

/** How widely a faculty profile is exposed. */
export type FacultyVisibility = 'public' | 'institutional' | 'faculty'

/**
 * FacultyProfile — the editable institutional identity a faculty member owns
 * (DATABASE_SCHEMA users + faculty fields). Verified contribution metrics are
 * NOT here: they come from the contribution services (problems/reviews/dashboard/
 * leaderboard) and {@link FacultyReputation}, which the faculty can never edit.
 */
export interface FacultyProfile {
  userId: string
  name: string
  avatarInitials: string
  /** Institutional identifier, e.g. 'FAC-9920-X82'. */
  facultyId: string
  designation: string
  department: string
  email: string
  phone?: string
  bio: string
  /** Short teaching focus line shown on the About card. */
  teachingFocus: string
  /** Short innovation focus line shown on the About card. */
  innovationFocus: string
  experienceYears: number
  /** Research domains / areas of expertise (tag list). */
  researchDomains: string[]
  /** Technical mastery skills (tag list). */
  skills: string[]
  officeLocation: string
  /** Mentorship capacity — max concurrent teams. */
  maxTeams: number
  /** Whether the faculty accepts new student mentorship requests. */
  openForMentorship: boolean
  visibility: FacultyVisibility
  github?: string
  linkedin?: string
}

/**
 * Verified, system-generated faculty standing — sourced from platform activity,
 * never editable by the faculty. Displayed read-only on the Faculty Profile.
 */
export interface FacultyReputation {
  rank: number
  /** e.g. 'Top 5% Faculty'. */
  percentileLabel: string
  /** Reputation dimensions (0–100), e.g. Review Quality, Mentorship Score. */
  scores: { label: string; value: number }[]
  /** Earned standing badges. */
  badges: { icon: string; label: string }[]
  /** Progress toward the next badge (0–100). */
  nextBadge: { label: string; progress: number }
  /** Review-engine gauges (0–100 unless suffix given). */
  engineMetrics: { label: string; value: number; caption: string }[]
  /** Portfolio artifact counts (publications, case studies, …). */
  portfolio: { label: string; icon: string; count: number }[]
}

/** Fields the student owns and edits via {@link StudentProfile}. */
export type ProfileOwnedField =
  | 'name'
  | 'avatarInitials'
  | 'headline'
  | 'tagline'
  | 'bio'
  | 'department'
  | 'batch'
  | 'rollNumber'
  | 'pronouns'
  | 'location'
  | 'institutionalEmail'
  | 'github'
  | 'linkedin'
  | 'personalSkills'

/**
 * The verified/generated half of a portfolio — everything sourced from trusted
 * modules (Credit Engine, Leaderboard, Project Workspace, Review Engine,
 * Research) that a student can never self-edit. Merged with {@link StudentProfile}
 * identity to form the composed {@link Portfolio}.
 */
export type PortfolioVerified = Omit<Portfolio, ProfileOwnedField>

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
  /** The project under review — links a submission back to its workspace. */
  projectId?: string
  projectTitle: string
  teamName: string
  /** The team that submitted. */
  teamId?: string
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
  institution: string
  credits: number
  projects: number
  status: 'active' | 'pending' | 'suspended'
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
  /** The project that shipped this solution — links a solution back to its workspace. */
  projectId?: string
  /** The problem the solution answers — links a solution back to its brief. */
  problemId?: string
  /** External destination for the card CTA; internal routing is used when absent. */
  url?: string
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
  /**
   * In-app destination for the notification — the link back to the module that
   * raised it. Built with buildPath/ROUTES so the panel never hardcodes a path.
   */
  link?: string
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
  /** The team extending the invitation. */
  teamId: string
  /** The problem the team formed around — lets the invitee read the brief first. */
  problemId?: string
  /** Set once the invitation is accepted, so the UI can open the workspace. */
  projectId?: string
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

/* ── Admin Dashboard ("Platform Snapshot") view models ──────────────────────
   Aggregated read-models for the institutional command center. Composed by the
   admin service from the domain sources (users, institutions, projects, reviews,
   credits, moderation, audit); the dashboard never owns business logic. */

export type AdminKpiTone = 'positive' | 'neutral' | 'brand' | 'critical'

/** A headline platform metric tile (Total Institutions, Total Users, …). */
export interface AdminKpi {
  label: string
  value: string
  note: string
  tone: AdminKpiTone
}

export type QueuePriority = 'High' | 'Med' | 'Urgent'

/** An item awaiting admin action in the operational queue. */
export interface OperationalQueueItem {
  id: string
  label: string
  count: number
  unit: string
  icon: string
  priority: QueuePriority
  tone: 'error' | 'warning' | 'secondary'
}

/** A moderation counter (reported users/projects, policy violations, …). */
export interface ModerationStat {
  label: string
  value: number
  tone: 'error' | 'warning' | 'neutral'
}

/** A partner institution row in the Institution Management table. */
export interface AdminInstitutionRow {
  id: string
  name: string
  location: string
  principal: string
  students: number
  faculty: number
  projects: number
  status: 'Active' | 'Inactive'
  participation: string
  participationActive: boolean
}

/** A recent activity line for a partner institution. */
export interface InstitutionActivityItem {
  id: string
  institution: string
  detail: string
}

/** A platform health indicator; `fill` (0–100) drives the mini gauge, if any. */
export interface PlatformHealthMetric {
  label: string
  value: string
  tone: 'good' | 'neutral'
  fill?: number
}

/** A recent system log line. */
export interface SystemLogEntry {
  id: string
  time: string
  actor: string
  message: string
  result: 'SUCCESS' | 'FLAGGED'
}

/** A formal transaction-audit record. */
export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  actor: string
  target: string
  result: string
  ok: boolean
}

/* ── Admin Users ("Access & Identity") panel view models ────────────────────
   Aggregated read-models for the panels that surround the user directory
   (KPIs, verification queue, identity health, audit log). The directory rows
   themselves are DirectoryUser[]; these power the summary panels only. */

export type UserKpiTone = 'positive' | 'neutral' | 'critical'

/** A headline user metric; `progress` (0–100) draws the mini bar when present. */
export interface UserKpi {
  label: string
  value: string
  note?: string
  tone: UserKpiTone
  progress?: number
  /** Draw the critical card ring + red label (Stitch: "Pending Verif."). */
  ring?: boolean
}

/** A verification-center queue card. */
export interface VerificationQueueItem {
  id: string
  label: string
  count: number
  unit: string
  icon: string
  priority: 'Urgent' | 'Med' | 'High' | 'Low'
  tone: 'secondary' | 'warning' | 'error' | 'neutral'
}

/** A user-management audit line. */
export interface UserAuditEntry {
  id: string
  time: string
  actor: string
  message: string
  target: string
  result: string
  ok: boolean
}

/** The panel aggregate powering the Admin Users page (directory served separately). */
export interface UsersOverview {
  kpis: UserKpi[]
  verificationQueue: VerificationQueueItem[]
  identityHealth: PlatformHealthMetric[]
  auditLog: UserAuditEntry[]
}

/* ── Admin Institutions ("Institution Governance") view models ──────────────
   The partner-institution entity behind the Admin Institutions console, its
   edit payload, and the panel aggregate (KPI tiles + governance audit) that
   frames the directory. Distinct from {@link Institution}, which models the
   per-department breakdown shown on the executive dashboards. */

export type InstitutionStatus = 'active' | 'pending' | 'suspended'

/** The principal holding authority over an institution. */
export interface InstitutionPrincipal {
  name: string
  email: string
  /** Identity verified against the institutional domain. */
  verified: boolean
}

/** A partner institution managed from the Admin Institutions console. */
export interface AdminInstitution {
  id: string
  /** Short display name shown in the directory, e.g. 'CRCE'. */
  name: string
  /** Full registered name shown in the details drawer. */
  fullName: string
  /** Institution code, e.g. 'IN-MUM-01'. */
  code: string
  /** Institution type, e.g. 'Engineering'. */
  type: string
  city: string
  state: string
  website?: string
  supportEmail?: string
  address?: string
  status: InstitutionStatus
  /** Governance tier badge, e.g. 'CAMPUS_LEVEL_01'. */
  tier: string
  /** Absent until a principal is assigned. */
  principal?: InstitutionPrincipal
  /** Ecosystem snapshot — owned upstream by the user/analytics services. */
  students: number
  faculty: number
  projects: number
  credits: number
}

/** The admin-editable subset of an institution (create and edit share it). */
export interface InstitutionInput {
  name: string
  fullName: string
  code: string
  type: string
  city: string
  state: string
  website?: string
  supportEmail?: string
  address?: string
  principalName?: string
  principalEmail?: string
}

/** KPI tiles reuse the Admin Users tile model — identical shape and rendering. */
export type InstitutionKpi = UserKpi

/** A governance audit line under the institution directory. */
export interface InstitutionAuditEntry {
  id: string
  title: string
  detail: string
  actor: string
  time: string
  tone: 'secondary' | 'success' | 'warning'
}

/** The panel aggregate powering Admin Institutions (directory served separately). */
export interface InstitutionsOverview {
  kpis: InstitutionKpi[]
  auditLog: InstitutionAuditEntry[]
}

/** The full aggregate powering the Admin Dashboard. */
export interface AdminDashboardData {
  kpis: AdminKpi[]
  adoption: TrendPoint[]
  operationalQueue: OperationalQueueItem[]
  moderation: ModerationStat[]
  institutions: AdminInstitutionRow[]
  recentInstitutionActivity: InstitutionActivityItem[]
  platformHealth: PlatformHealthMetric[]
  systemLogs: SystemLogEntry[]
  auditLog: AuditEntry[]
}

/* ---------------------------------------------------------------------------
 * Institution analytics — the executive (Principal) read model.
 * Aggregated by the analytics layer from the existing domains (users, problems,
 * projects, reviews, credits); the dashboard never recomputes any of it.
 * ------------------------------------------------------------------------ */

export type MetricTone = 'muted' | 'brand' | 'positive' | 'critical'

/** A snapshot tile in the Institution / Innovation grids. */
export interface InstitutionMetric {
  id: string
  label: string
  value: string
  /** Material Symbols name — rendered by the Institution Analytics summary tiles. */
  icon?: string
  /** Chip beside the value — '+2.4%', 'LIVE', '1 GRANTED'. */
  badge?: string
  badgeTone?: MetricTone
  /** Footnote under the value — 'PhD Ratio: 64%'. A `critical` note renders as a pill. */
  note?: string
  noteTone?: MetricTone
  /** Footnote rendered in the mono face (credit figures). */
  monoNote?: boolean
  /** 0–100 meter under the value. */
  fill?: number
  fillTone?: MetricTone
  /** Renders N stacked participant chips (Live Projects tile). */
  participants?: number
}

/**
 * One department's standing. Shared by both principal views: the dashboard
 * renders credits/success/backlog, Institution Analytics renders completion and
 * the health indicator — one row, never two competing department models.
 */
export interface DepartmentHealth {
  id: string
  name: string
  activeProjects: number
  /** Credits earned, pre-formatted by the analytics layer ('420k'). */
  credits: string
  /** Milestone success rate, 0–100. */
  successRate: number
  /** Project completion rate, 0–100. */
  completionRate: number
  /** Health indicator for the analytics table — false flags a department to watch. */
  healthy: boolean
  pendingReviews: number
  /** Backlog needing the principal's attention — rendered in the error tone. */
  pendingReviewsCritical: boolean
}

/** A governance item awaiting the principal in the Institution Decisions grid. */
export interface InstitutionDecision {
  id: string
  title: string
  detail: string
  /** Material Symbols name. */
  icon: string
  cta: string
  tone: 'brand' | 'critical'
}

/** One month of institutional throughput (bars = credits, line = projects). */
export interface GrowthPoint {
  month: string
  credits: number
  projects: number
}

/** A supporting figure under the growth chart. */
export interface AnalyticsHighlight {
  label: string
  value: string
  note: string
  noteTone: MetricTone
}

/** Innovation health headline on Institution Analytics. */
export interface InnovationHealth {
  /** Qualitative standing, e.g. 'Excellent'. */
  status: string
  /** Movement against the comparison window, e.g. '+12.4%'. */
  change: string
  /** What the change is measured against, e.g. 'vs last quarter'. */
  caption: string
}

/** A governance request queued for the principal (read-only listing). */
export interface InstitutionApproval {
  id: string
  title: string
  /** Material Symbols name. */
  icon: string
  /** Chip label — 'Urgent', 'Medium'. */
  priority: string
  submittedBy: string
  /** Display date, pre-formatted ('24 Oct, 2024'). */
  date: string
}

/** A report the principal can generate from the analytics workspace. */
export interface ReportOption {
  id: string
  label: string
  /** Material Symbols name (categories only). */
  icon?: string
}

/**
 * The full aggregate powering BOTH principal views
 * (GET /api/v1/analytics/institution): the dashboard reads the snapshot,
 * innovation, decision and growth sections; Institution Analytics reads the
 * health headline, summary tiles, approvals and report options. Departments are
 * shared. One endpoint, one aggregate — no second analytics source.
 */
export interface InstitutionAnalytics {
  institutionName: string
  /** Header caption — 'Executive Overview • Academic Year 2024-25'. */
  period: string
  health: InnovationHealth
  /** Headline tiles on Institution Analytics (icon + label + value). */
  summary: InstitutionMetric[]
  approvals: InstitutionApproval[]
  /** Count behind the 'N NEW' badge on the approvals rail. */
  newApprovalsCount: number
  reportCategories: ReportOption[]
  reportFormats: ReportOption[]
  snapshot: InstitutionMetric[]
  innovation: InstitutionMetric[]
  departments: DepartmentHealth[]
  decisions: InstitutionDecision[]
  /** Total open items behind the decisions grid ('18 ITEMS'). */
  decisionCount: number
  growth: GrowthPoint[]
  highlights: AnalyticsHighlight[]
  /** Radar axes for the department comparison chart, values 0–100. */
  departmentRadar: NameValue[]
  /** Department performance meters under the radar, values 0–100. */
  departmentPerformance: NameValue[]
}
