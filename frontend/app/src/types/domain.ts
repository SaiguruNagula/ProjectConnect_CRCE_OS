/**
 * Domain types for the demo. Shaped to mirror DATABASE_SCHEMA.md so mock data
 * can be swapped for real API responses without changing components.
 */
import type { Role } from '@/types'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProblemStatus = 'open' | 'in_progress' | 'closed'
export type ProjectStatus = 'active' | 'in_review' | 'completed'

/**
 * Server-side pagination envelope. Any list that grows unbounded is served in
 * this shape so no component slices an array itself — the same contract the
 * FastAPI endpoints will return.
 */
export interface Paginated<T> {
  items: T[]
  /** 1-based page number actually served (clamped to `totalPages`). */
  page: number
  limit: number
  /** Rows matching the query across every page. */
  total: number
  totalPages: number
}

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

export type ProblemSort = 'newest' | 'credits'

/**
 * Query for GET /api/v1/problems. Search, filtering, sorting and paging all
 * travel together so the catalog reads the same whether it is served by the mock
 * repository or the API.
 */
export interface ProblemQuery {
  page: number
  limit: number
  /** Free-text across title, summary, department and faculty. */
  search?: string
  /** Exact department match; omit for every department. */
  department?: string
  /** Restrict to the signed-in student's bookmarks. */
  savedOnly?: boolean
  sort?: ProblemSort
}

/** Catalog-wide counters, computed server-side across the whole result set. */
export interface ProblemCatalogStats {
  problems: number
  departments: number
  teams: number
}

/**
 * One page of the Open Problems catalog plus the facets and counters the page
 * header needs — the repository owns them so the UI never derives a filter list
 * or a stat from the rows it happens to be showing.
 */
export interface ProblemCatalogPage extends Paginated<Problem> {
  /** Every department available as a filter, not just those on this page. */
  departments: string[]
  stats: ProblemCatalogStats
}

/* ------------------------------------------------ Student problem suggestion */

/**
 * Lifecycle of a student-suggested problem. A suggestion is never published
 * directly: it waits on the nominated mentor, who approves it, asks for changes
 * or rejects it. Only an approved suggestion is published as an open
 * {@link Problem}.
 */
export type ProblemSuggestionStatus =
  | 'draft'
  | 'pending_mentor_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected'

/** Request body for POST /api/v1/problem-suggestions. */
export interface ProblemSuggestionInput {
  title: string
  description: string
  /** Domain the problem belongs to; becomes the published problem's department. */
  category: string
  /** Why is this problem important? */
  importance: string
  expectedImpact: string
  /** The mentor nominated to review it — {@link MentorOption.id}. */
  mentorId: string
  /** Optional supporting reading, one URL per entry. */
  referenceLinks: string[]
}

/** Read model for a suggestion, as its author and its mentor both see it. */
export interface ProblemSuggestion {
  id: string
  status: ProblemSuggestionStatus
  input: ProblemSuggestionInput
  /** Denormalised for display — the mentor nominated on the suggestion. */
  mentorName: string
  submittedBy: string
  submittedAt: string
  reviewedAt?: string
  /** The mentor's note; required on changes-requested and rejected decisions. */
  mentorFeedback?: string
  /** Set once approval publishes the suggestion into Open Problems. */
  publishedProblemId?: string
}

/** A mentor a student can nominate — GET /api/v1/mentors. */
export interface MentorOption {
  id: string
  name: string
  department: string
}

/** Mentor decision — POST /api/v1/problem-suggestions/{id}/decision. */
export interface SuggestionDecisionInput {
  suggestionId: string
  decision: Extract<ProblemSuggestionStatus, 'approved' | 'changes_requested' | 'rejected'>
  /** Required for changes_requested and rejected so the student knows what to do. */
  feedback: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatarInitials: string
}

/**
 * Where a team sits in the problem lifecycle. Composed by the API from the
 * team's application and selection state — never derived in the UI.
 */
export type TeamStatus = 'recruiting' | 'applied' | 'selected' | 'completed'

/** An outstanding invitation the team lead has sent but nobody has answered. */
export interface TeamInvite {
  id: string
  email: string
  /** The role the invitee is being recruited for. */
  role: string
  invitedAt: string
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
  /** The member who owns the roster — only they may invite or remove. */
  leaderId: string
  /** ISO timestamp the team was formed. */
  createdAt: string
  status: TeamStatus
  /** Remaining open slots. */
  openSpots: number
  /** Roles/skills the team still needs — powers the discovery filters. */
  lookingFor: string[]
  /** Invitations sent by the lead and still unanswered. */
  pendingInvites: TeamInvite[]
  /**
   * Whether the caller may invite and remove members. Composed server-side from
   * the auth token so no surface has to re-derive the permission.
   */
  canManage: boolean
  /** The current student's own team (drives the member list + apply-as-team). */
  mine?: boolean
  /** Set once the student has requested to join (drives the disabled CTA). */
  joinRequested?: boolean
}

/** Invite payload — POST /api/v1/teams/{id}/invitations. */
export interface InviteMemberInput {
  email: string
  role: string
}

/** Create-team payload — POST /api/v1/teams. */
export interface CreateTeamInput {
  problemId: string
  name: string
  /** The team's pitch/idea — shown as the idea summary on the team card. */
  pitch: string
  /** Roles/skills the team is recruiting for. */
  lookingFor: string[]
}

/**
 * Application payload — POST /api/v1/problems/{id}/applications. One contract
 * covers both routes into a problem: omit `teamId` to apply solo, pass it to
 * apply as that team.
 */
export interface ApplicationInput {
  /** Apply as this team; omit to apply solo. */
  teamId?: string
  /** Short summary of the idea being proposed. */
  ideaSummary: string
  /** How the student or team intends to solve it. */
  approach: string
  /** Optional attachment or proof-of-concept link. */
  attachmentUrl?: string
}

/**
 * A pending request to join a team. Only the team lead sees these, and only the
 * lead can accept or reject one.
 */
export interface JoinRequest {
  id: string
  teamId: string
  teamName: string
  studentId: string
  studentName: string
  avatarInitials: string
  /** What the student wants to contribute. */
  message: string
  requestedAt: string
}

export interface Project {
  id: string
  title: string
  summary: string
  status: ProjectStatus
  progress: number
  mentorName: string
  members: TeamMember[]
  /** The problem this project was built to solve — links the workspace back to its brief. */
  problemId?: string
  /** The team executing the project. */
  teamId?: string
  /**
   * Where the project sits in the innovation lifecycle. Derived by the
   * repository/backend from the submission journey so no list page recomputes it.
   */
  stage: SubmissionStage
  /** Status of {@link stage}. */
  stageStatus: StageStatus
  /** ISO date the final submission was approved; set on completed projects only. */
  completedAt?: string
}

/* ------------------------------------------------ Four-stage submission flow */

/**
 * The CRCE OS innovation lifecycle, in order: capture the idea, prove it, get
 * selected by faculty, then build and submit the final project. This is the
 * whole student workflow — there is no task board behind it.
 */
export type SubmissionStage = 'idea' | 'poc' | 'selection' | 'final'

/** Status of a student-authored stage (Idea, Proof of Concept, Final Project). */
export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'

/** Where the team stands in faculty selection (Stage 3). */
export type SelectionStatus = 'not_reviewed' | 'changes_requested' | 'selected' | 'not_selected'

/** Status of whichever stage a project currently sits in. */
export type StageStatus = SubmissionStatus | SelectionStatus

/** Stage 1 payload — PUT /api/v1/projects/{id}/idea. */
export interface IdeaSubmission {
  title: string
  problemStatement: string
  proposedSolution: string
  approach: string
  techStack: string[]
  expectedOutcome: string
  /** Optional slide deck link. */
  presentationUrl?: string
  supportingLinks: string[]
}

/** Stage 2 payload — PUT /api/v1/projects/{id}/proof-of-concept. */
export interface PocSubmission {
  description: string
  githubUrl: string
  demoUrl?: string
  prototypeImages: string[]
  presentationUrl?: string
  videoUrl?: string
  documents: string[]
}

/** Stage 4 payload — PUT /api/v1/projects/{id}/final. */
export interface FinalSubmission {
  description: string
  githubUrl: string
  liveUrl?: string
  demoUrl?: string
  presentationUrl?: string
  reportUrl?: string
  videoUrl?: string
  techStack: string[]
  screenshots: string[]
  documents: string[]
}

/**
 * Structured faculty feedback on one stage. Every field is optional so a
 * reviewer can leave only what is useful; the student sees it verbatim.
 */
export interface StageReview {
  strengths?: string
  weaknesses?: string
  suggestions?: string
  /** Free-form closing remarks. */
  comments?: string
  reviewedBy?: string
  /** Stage 3 evaluation, present on the Final Project review only. */
  evaluation?: FinalEvaluation
}

/** Scored evaluation captured when a final project is reviewed (0–10 each). */
export interface FinalEvaluation {
  innovation: number
  technicalQuality: number
  implementation: number
  documentation: number
  presentation: number
  overallRemarks: string
}

/** A student-authored stage plus the review state the backend owns. */
export interface StageState<T> {
  status: SubmissionStatus
  /** Null until the student first saves a draft. */
  data: T | null
  savedAt?: string
  submittedAt?: string
  /** Reviewer verdict, shown to the student verbatim. */
  review?: StageReview
  reviewedAt?: string
}

/** Faculty's Stage 3 decision as the student sees it. */
export interface SelectionState {
  status: SelectionStatus
  feedback?: string
  decidedBy?: string
  decidedAt?: string
}

/**
 * The single lifecycle status shown on every review surface. Replaces the old
 * per-module status vocabularies so a card, a badge and a timeline all read the
 * same value.
 */
export type ReviewLifecycleStatus =
  | 'idea_submitted'
  | 'idea_approved'
  | 'poc_submitted'
  | 'poc_approved'
  | 'selected_for_final'
  | 'final_submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'completed'

/** One step of the submission timeline, composed by the repository/backend. */
export interface ReviewTimelineEvent {
  status: ReviewLifecycleStatus
  label: string
  /** ISO timestamp once the step has happened. */
  at?: string
  done: boolean
}

/**
 * Credits a faculty awards on final approval. The Credit Engine consumes these
 * values later; the frontend only captures and displays them.
 */
export interface CreditAward {
  innovation: number
  implementation: number
  documentation: number
  presentation: number
  bonus: number
  /** Sum of the five components, computed below the UI. */
  total: number
  awardedBy?: string
  awardedAt?: string
}

/**
 * One project's whole four-stage journey — GET /api/v1/projects/{id}/journey.
 * Composed by the repository (later the backend) from the problem, the team and
 * the submissions, so the workspace renders it without deriving anything.
 */
export interface ProjectJourney {
  projectId: string
  title: string
  /** The problem this journey answers — links each stage back to its brief. */
  problemId?: string
  problemTitle?: string
  teamId?: string
  teamName: string
  mentorName: string
  /** The roster, owned by the team — the Idea stage displays it, never re-enters it. */
  members: TeamMember[]
  /** The stage the student should act on now. */
  currentStage: SubmissionStage
  /** Stages the student may open; Final unlocks only once the team is selected. */
  unlockedStages: SubmissionStage[]
  idea: StageState<IdeaSubmission>
  poc: StageState<PocSubmission>
  selection: SelectionState
  final: StageState<FinalSubmission>
  /** Where the project sits in the review lifecycle — one status for every surface. */
  status: ReviewLifecycleStatus
  /** Idea → Approved → PoC → Selected → Final → Completed, already ordered. */
  timeline: ReviewTimelineEvent[]
  /** Set once faculty award credits on final approval. */
  credits?: CreditAward
  /** Whether the approved project was published to the Solutions Hub. */
  published?: boolean
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
    /** Certificates and achievements earned outside the platform. */
    credentials: boolean
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

/* --------------------------------------------------------- Review Engine */

/**
 * The four faculty review queues. `poc` also carries the "select for final
 * development" decision, so selection is not a queue of its own.
 */
export type ReviewQueueId = 'idea' | 'poc' | 'final' | 'completed'

/** The stages a faculty actually reviews — Stage 3 rides on the PoC queue. */
export type ReviewableStage = Extract<SubmissionStage, 'idea' | 'poc' | 'final'>

/** One card in a review queue — a submission waiting on (or past) a decision. */
export interface ReviewQueueItem {
  projectId: string
  /** Problem the submission answers — the review's entry point. */
  problemId?: string
  problemTitle: string
  /** Team name, or the student's name for a solo application. */
  teamName: string
  teamId?: string
  members: TeamMember[]
  /** Stage the pending submission belongs to. */
  stage: ReviewableStage
  submittedAt?: string
  status: ReviewLifecycleStatus
  mentorName: string
  /** Number of links/files attached to the submission under review. */
  attachments: number
}

/** Every queue plus its pending count — GET /api/v1/reviews/queues. */
export type ReviewQueues = Record<ReviewQueueId, ReviewQueueItem[]>

/** What a faculty can decide on a stage. `select` exists on the PoC stage only. */
export type ReviewDecision = 'approve' | 'changes_requested' | 'reject' | 'select'

/** Payload a faculty decision posts — POST /api/v1/reviews/{projectId}/{stage}. */
export interface StageReviewInput {
  projectId: string
  stage: ReviewableStage
  decision: ReviewDecision
  review: StageReview
}

/** Credit award posted on final approval — POST /api/v1/projects/{id}/credits. */
export interface CreditAwardInput {
  projectId: string
  innovation: number
  implementation: number
  documentation: number
  presentation: number
  bonus: number
}

/** Publication choice after final approval — POST /api/v1/projects/{id}/publication. */
export interface PublicationInput {
  projectId: string
  /** True publishes to the Solutions Hub, false keeps the project internal. */
  publish: boolean
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
  /**
   * Deployment state. Absent when nothing on the platform records one — the
   * badge is then omitted rather than guessed.
   */
  status?: SolutionStatus
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
  /** Absent unless something measures usage; the hero shows an em dash. */
  campusUsers?: string
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
