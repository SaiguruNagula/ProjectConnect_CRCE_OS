/**
 * Repository contracts — the data-access boundary.
 *
 * Services depend on these interfaces, never on a concrete data source. Today
 * they are satisfied by mock repositories (repositories/mock); later by API
 * repositories that call FastAPI. Swapping implementations changes nothing above
 * this layer. Return shapes mirror API_SPEC.md / DATABASE_SCHEMA.md.
 */
import type { Role } from '@/types'
import type {
  Activity,
  AdminDashboardData,
  AdminInstitution,
  ApplicationInput,
  CreateProblemInput,
  CreditCategory,
  CreditPipelineItem,
  CreditRule,
  CreditSummary,
  CreditTransaction,
  Deadline,
  DashboardStats,
  DirectoryUser,
  FacultyProfile,
  FacultyReputation,
  Institution,
  InstitutionAnalytics,
  InstitutionInput,
  InstitutionsOverview,
  InstitutionStatus,
  CreateTeamInput,
  FinalSubmission,
  IdeaSubmission,
  Invitation,
  JoinRequest,
  LeaderboardEntry,
  MentorOption,
  NameValue,
  Notification,
  PocSubmission,
  ProblemCatalogPage,
  ProblemDraft,
  ProblemQuery,
  ProblemSuggestion,
  ProblemSuggestionInput,
  Portfolio,
  PortfolioCustomization,
  Problem,
  Project,
  ProjectJourney,
  SelectionDecisionInput,
  StudentProfile,
  SuggestionDecisionInput,
  Team,
  ReviewDecisionInput,
  ReviewStats,
  ReviewSubmission,
  RubricCriterion,
  Solution,
  SolutionStats,
  TrendPoint,
  UsersOverview,
} from '@/types/domain'

export interface ProblemRepository {
  list(): Promise<Problem[]>
  /**
   * One page of the catalog with its facets and counters — searching, filtering,
   * sorting and paging all happen here (GET /api/v1/problems?page&limit&…).
   */
  page(query: ProblemQuery): Promise<ProblemCatalogPage>
  get(id: string): Promise<Problem | null>
  /** Publish a new problem (status → open); it becomes available in Open Problems. */
  create(input: CreateProblemInput): Promise<Problem>
  /** Persist an in-progress draft without publishing it publicly. */
  saveDraft(input: CreateProblemInput): Promise<void>
  /** The author's saved-but-unpublished drafts, so authoring can be resumed. */
  drafts(): Promise<ProblemDraft[]>
  /** Toggle the signed-in student's bookmark; returns the updated problem. */
  setBookmark(id: string, bookmarked: boolean): Promise<Problem>
  /** Mentors a student can nominate on a suggestion — GET /api/v1/mentors. */
  mentors(): Promise<MentorOption[]>
  /**
   * Suggestions visible to the signed-in user: their own as a student, the ones
   * nominating them as a mentor (GET /api/v1/problem-suggestions).
   */
  suggestions(): Promise<ProblemSuggestion[]>
  /**
   * Save a suggestion as a draft (`submit: false`) or send it for mentor review
   * (`submit: true`). Pass `id` to replace an existing draft or resubmit one that
   * came back with changes requested. A suggestion is never published from here.
   */
  saveSuggestion(
    input: ProblemSuggestionInput,
    submit: boolean,
    id?: string,
  ): Promise<ProblemSuggestion>
  /**
   * The nominated mentor's decision. Approving publishes the suggestion as an
   * open problem and links it back via `publishedProblemId`.
   */
  decideSuggestion(input: SuggestionDecisionInput): Promise<ProblemSuggestion>
}

export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  invitations(): Promise<Invitation[]>
  /** Teams formed for a problem; omit `problemId` for the full list. */
  teams(problemId?: string): Promise<Team[]>
  /** Form a team around a problem — POST /api/v1/teams. */
  createTeam(input: CreateTeamInput): Promise<Team>
  /** Ask to join an existing team; returns the updated team. */
  requestToJoin(teamId: string, message: string): Promise<Team>
  /** Requests waiting on the signed-in student's own team — lead only. */
  joinRequests(): Promise<JoinRequest[]>
  /** Team lead accepts or rejects a join request; returns the remaining ones. */
  respondToJoinRequest(requestId: string, accept: boolean): Promise<JoinRequest[]>
  /** Accept or decline an invitation; returns the remaining pending invitations. */
  respondToInvitation(invitationId: string, accept: boolean): Promise<Invitation[]>
  /** Apply to a problem, solo or as a team, with the idea being proposed. */
  applyToProblem(problemId: string, input: ApplicationInput): Promise<Problem>
  /** Withdraw an application before the guide reviews it. */
  withdrawApplication(problemId: string): Promise<Problem>
  /** The four-stage submission journey for one project. */
  journey(projectId: string): Promise<ProjectJourney | null>
  /** Save the Idea stage as a draft, or submit it for review. */
  saveIdea(projectId: string, data: IdeaSubmission, submit: boolean): Promise<ProjectJourney>
  /** Save the Proof of Concept stage as a draft, or submit it for review. */
  savePoc(projectId: string, data: PocSubmission, submit: boolean): Promise<ProjectJourney>
  /** Save the Final Project stage as a draft, or submit it for review. */
  saveFinal(projectId: string, data: FinalSubmission, submit: boolean): Promise<ProjectJourney>
  /** Faculty Stage-3 decision — only a selected team unlocks the Final stage. */
  decideSelection(input: SelectionDecisionInput): Promise<ProjectJourney>
}

export interface LeaderboardRepository {
  students(): Promise<LeaderboardEntry[]>
  faculty(): Promise<LeaderboardEntry[]>
}

/**
 * The editable identity source of truth. `get` returns the student's own
 * profile; `update` persists an edit (mock: in-session) and returns the new
 * state. The portfolio repository reads from here, so an update reflects there
 * automatically.
 */
export interface ProfileRepository {
  get(userId?: string): Promise<StudentProfile>
  update(patch: Partial<StudentProfile>): Promise<StudentProfile>
}

/**
 * The public portfolio. `get` returns the composed public view (profile identity
 * + verified modules). `getCustomization`/`updateCustomization` expose the
 * student's own curation layer — headline, intro, featured skills, section
 * visibility and publish state — which the owner edits independently of the
 * profile.
 */
/**
 * The faculty's editable institutional identity + read-only verified standing.
 * `get`/`update` own the editable profile; `reputation` returns system-generated
 * metrics the faculty can never modify.
 */
export interface FacultyProfileRepository {
  get(): Promise<FacultyProfile>
  update(patch: Partial<FacultyProfile>): Promise<FacultyProfile>
  reputation(): Promise<FacultyReputation>
}

export interface PortfolioRepository {
  get(userId: string): Promise<Portfolio>
  getCustomization(): Promise<PortfolioCustomization>
  updateCustomization(patch: Partial<PortfolioCustomization>): Promise<PortfolioCustomization>
}

export interface CreditRepository {
  history(): Promise<CreditTransaction[]>
  breakdown(): Promise<NameValue[]>
  rules(): Promise<CreditRule[]>
  summary(): Promise<CreditSummary>
  categories(): Promise<CreditCategory[]>
  pipeline(): Promise<CreditPipelineItem[]>
}

export interface ReviewRepository {
  list(): Promise<ReviewSubmission[]>
  rubric(): Promise<RubricCriterion[]>
  stats(): Promise<ReviewStats>
  /** Post a faculty decision; returns the updated submission. */
  submitDecision(input: ReviewDecisionInput): Promise<ReviewSubmission>
}

export interface SolutionRepository {
  list(): Promise<Solution[]>
  stats(): Promise<SolutionStats>
}

export interface AdminRepository {
  users(): Promise<DirectoryUser[]>
  /** Per-department breakdown used by the executive dashboards. */
  institutions(): Promise<Institution[]>
  /** Partner institutions behind the Admin Institutions console (GET /api/v1/admin/institutions). */
  institutionDirectory(): Promise<AdminInstitution[]>
  /** Summary panels for the Admin Institutions page (GET /api/v1/admin/institutions/overview). */
  institutionsOverview(): Promise<InstitutionsOverview>
  /** Create (no id) or update an institution — POST/PATCH /api/v1/admin/institutions[/{id}]. */
  saveInstitution(input: InstitutionInput, id?: string): Promise<AdminInstitution>
  /** Verify, activate or suspend — PATCH /api/v1/admin/institutions/{id}/status. */
  setInstitutionStatus(id: string, status: InstitutionStatus): Promise<AdminInstitution>
  /** Aggregate powering the Admin Dashboard (GET /api/v1/admin/dashboard). */
  dashboard(): Promise<AdminDashboardData>
  /** Summary panels for the Admin Users page (GET /api/v1/admin/users/overview). */
  usersOverview(): Promise<UsersOverview>
}

/**
 * Institution-wide analytics. Aggregation belongs to this layer (and later the
 * backend), never to the dashboards that render it.
 */
export interface AnalyticsRepository {
  /** Executive aggregate powering the Principal Dashboard (GET /api/v1/analytics/institution). */
  institution(): Promise<InstitutionAnalytics>
  /**
   * Public headline metrics shared by the Landing, About and Innovation Hub
   * pages (GET /api/v1/analytics/campus-impact). Counted here so no page
   * hardcodes or recomputes them.
   */
  campusImpact(): Promise<NameValue[]>
}

/**
 * Cross-cutting notification feed. Every module that performs an action ends up
 * here, so it is its own repository rather than a dashboard concern.
 */
export interface NotificationRepository {
  /** GET /api/v1/notifications */
  list(): Promise<Notification[]>
  /** PATCH /api/v1/notifications/{id}/read — returns the updated feed. */
  markRead(id: string): Promise<Notification[]>
  /** POST /api/v1/notifications/read-all — returns the updated feed. */
  markAllRead(): Promise<Notification[]>
}

export interface DashboardRepository {
  stats(role: Role): Promise<DashboardStats[]>
  activity(): Promise<Activity[]>
  deadlines(): Promise<Deadline[]>
  creditTrend(): Promise<TrendPoint[]>
  departmentDistribution(): Promise<NameValue[]>
}

/** The full set of repositories the app depends on. */
export interface Repositories {
  problems: ProblemRepository
  projects: ProjectRepository
  leaderboard: LeaderboardRepository
  profile: ProfileRepository
  facultyProfile: FacultyProfileRepository
  portfolio: PortfolioRepository
  credits: CreditRepository
  reviews: ReviewRepository
  solutions: SolutionRepository
  admin: AdminRepository
  analytics: AnalyticsRepository
  dashboard: DashboardRepository
  notifications: NotificationRepository
}
