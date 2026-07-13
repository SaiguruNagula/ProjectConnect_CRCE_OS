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
  CreditRule,
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
  ReviewSubmission,
  RubricCriterion,
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
}

export interface ReviewRepository {
  list(): Promise<ReviewSubmission[]>
  rubric(): Promise<RubricCriterion[]>
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
  admin: AdminRepository
  dashboard: DashboardRepository
}
