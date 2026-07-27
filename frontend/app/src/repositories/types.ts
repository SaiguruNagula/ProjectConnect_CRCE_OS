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
  Invitation,
  LeaderboardEntry,
  NameValue,
  Notification,
  Portfolio,
  PortfolioCustomization,
  Problem,
  Project,
  StudentProfile,
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
  get(id: string): Promise<Problem | null>
  /** Publish a new problem (status → open); it becomes available in Open Problems. */
  create(input: CreateProblemInput): Promise<Problem>
  /** Persist an in-progress draft without publishing it publicly. */
  saveDraft(input: CreateProblemInput): Promise<void>
}

export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  invitations(): Promise<Invitation[]>
  teams(): Promise<Team[]>
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
}

export interface DashboardRepository {
  stats(role: Role): Promise<DashboardStats[]>
  activity(): Promise<Activity[]>
  deadlines(): Promise<Deadline[]>
  notifications(): Promise<Notification[]>
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
}
