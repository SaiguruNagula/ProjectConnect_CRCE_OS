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
  CreditCategory,
  CreditPipelineItem,
  CreditRule,
  CreditSummary,
  CreditTransaction,
  Deadline,
  DashboardStats,
  DirectoryUser,
  Institution,
  Invitation,
  LeaderboardEntry,
  NameValue,
  Notification,
  Portfolio,
  Problem,
  Project,
  Team,
  ReviewDecisionInput,
  ReviewStats,
  ReviewSubmission,
  RubricCriterion,
  Solution,
  SolutionStats,
  TrendPoint,
} from '@/types/domain'

export interface ProblemRepository {
  list(): Promise<Problem[]>
  get(id: string): Promise<Problem | null>
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

export interface PortfolioRepository {
  get(userId: string): Promise<Portfolio>
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
  institutions(): Promise<Institution[]>
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
  portfolio: PortfolioRepository
  credits: CreditRepository
  reviews: ReviewRepository
  solutions: SolutionRepository
  admin: AdminRepository
  dashboard: DashboardRepository
}
