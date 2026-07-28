/**
 * Application services — business/orchestration layer.
 *
 * Services depend only on the repository contracts (repositories/index), never
 * on mock data or transport details. Pages/hooks call services; services call
 * repositories. This keeps the swap seam at the repository layer.
 */
import { repositories } from '@/repositories'
import type { Role } from '@/types'
import type {
  CreateProblemInput,
  CreateTeamInput,
  FacultyProfile,
  InstitutionInput,
  InstitutionStatus,
  MilestoneStatus,
  PortfolioCustomization,
  ReviewDecisionInput,
  StudentProfile,
} from '@/types/domain'

export const problemsService = {
  list: () => repositories.problems.list(),
  get: (id: string) => repositories.problems.get(id),
  /** Publish a new problem so students can discover it in Open Problems. */
  create: (input: CreateProblemInput) => repositories.problems.create(input),
  /** Save an in-progress draft without publishing. */
  saveDraft: (input: CreateProblemInput) => repositories.problems.saveDraft(input),
  /** The author's saved drafts, so authoring can be resumed. */
  drafts: () => repositories.problems.drafts(),
  /** Bookmark or un-bookmark a problem for the signed-in student. */
  setBookmark: (id: string, bookmarked: boolean) =>
    repositories.problems.setBookmark(id, bookmarked),
}

export const projectsService = {
  list: () => repositories.projects.list(),
  get: (id: string) => repositories.projects.get(id),
  invitations: () => repositories.projects.invitations(),
  /** Teams for one problem, or every team when `problemId` is omitted. */
  teams: (problemId?: string) => repositories.projects.teams(problemId),
  /** Form a team around a problem. */
  createTeam: (input: CreateTeamInput) => repositories.projects.createTeam(input),
  /** Ask an existing team for a spot. */
  requestToJoin: (teamId: string) => repositories.projects.requestToJoin(teamId),
  /** Accept or decline a pending invitation; returns the remaining invitations. */
  respondToInvitation: (invitationId: string, accept: boolean) =>
    repositories.projects.respondToInvitation(invitationId, accept),
  /** Register interest in a problem, individually or as a team. */
  applyToProblem: (problemId: string, teamId?: string) =>
    repositories.projects.applyToProblem(problemId, teamId),
  /** Withdraw a pending application. */
  withdrawApplication: (problemId: string) =>
    repositories.projects.withdrawApplication(problemId),
  /** Advance a milestone; the returned project carries the recomputed progress. */
  updateMilestone: (projectId: string, milestoneId: string, status: MilestoneStatus) =>
    repositories.projects.updateMilestone(projectId, milestoneId, status),
}

export const leaderboardService = {
  students: () => repositories.leaderboard.students(),
  faculty: () => repositories.leaderboard.faculty(),
}

/**
 * Editable identity source of truth. Students read and update their own
 * personal/professional data here; the portfolio is composed from it, so an
 * update propagates without re-entry.
 */
export const profileService = {
  get: () => repositories.profile.get(),
  update: (patch: Partial<StudentProfile>) => repositories.profile.update(patch),
}

/**
 * Editable faculty identity + read-only verified standing. Faculty read and
 * update their own profile here; `reputation` exposes system-generated metrics
 * the faculty can never edit.
 */
export const facultyProfileService = {
  get: () => repositories.facultyProfile.get(),
  update: (patch: Partial<FacultyProfile>) => repositories.facultyProfile.update(patch),
  reputation: () => repositories.facultyProfile.reputation(),
}

/**
 * Public portfolio. `get` returns the composed public view; `getCustomization`/
 * `updateCustomization` are the owner's editable curation layer — headline,
 * intro, featured skills, section visibility and publish state — independent of
 * the profile.
 */
export const portfolioService = {
  get: (userId: string) => repositories.portfolio.get(userId),
  getCustomization: () => repositories.portfolio.getCustomization(),
  updateCustomization: (patch: Partial<PortfolioCustomization>) =>
    repositories.portfolio.updateCustomization(patch),
}

export const creditsService = {
  history: () => repositories.credits.history(),
  breakdown: () => repositories.credits.breakdown(),
  rules: () => repositories.credits.rules(),
  summary: () => repositories.credits.summary(),
  categories: () => repositories.credits.categories(),
  pipeline: () => repositories.credits.pipeline(),
}

export const reviewsService = {
  list: () => repositories.reviews.list(),
  rubric: () => repositories.reviews.rubric(),
  stats: () => repositories.reviews.stats(),
  submitDecision: (input: ReviewDecisionInput) => repositories.reviews.submitDecision(input),
}

export const solutionsService = {
  list: () => repositories.solutions.list(),
  stats: () => repositories.solutions.stats(),
}

export const adminService = {
  users: () => repositories.admin.users(),
  institutions: () => repositories.admin.institutions(),
  /** Partner institutions powering the Admin Institutions directory. */
  institutionDirectory: () => repositories.admin.institutionDirectory(),
  /** Summary panels for the Admin Institutions page (KPIs, governance audit). */
  institutionsOverview: () => repositories.admin.institutionsOverview(),
  /** Register a new institution, or update an existing one when `id` is given. */
  saveInstitution: (input: InstitutionInput, id?: string) =>
    repositories.admin.saveInstitution(input, id),
  /** Verify, activate or suspend an institution's platform access. */
  setInstitutionStatus: (id: string, status: InstitutionStatus) =>
    repositories.admin.setInstitutionStatus(id, status),
  /** Aggregated snapshot for the Admin Dashboard (KPIs, queue, moderation, health, logs). */
  dashboard: () => repositories.admin.dashboard(),
  /** Summary panels for the Admin Users page (KPIs, verification queue, identity health, audit). */
  usersOverview: () => repositories.admin.usersOverview(),
}

/**
 * Institution-wide analytics for the executive dashboards. One aggregate call
 * instead of many domain calls — the aggregation lives in the repository/API,
 * not in the pages.
 */
export const analyticsService = {
  institution: () => repositories.analytics.institution(),
  /** Public headline metrics for the Landing, About and Innovation Hub pages. */
  campusImpact: () => repositories.analytics.campusImpact(),
}

export const dashboardService = {
  stats: (role: Role) => repositories.dashboard.stats(role),
  activity: () => repositories.dashboard.activity(),
  deadlines: () => repositories.dashboard.deadlines(),
  creditTrend: () => repositories.dashboard.creditTrend(),
  departmentDistribution: () => repositories.dashboard.departmentDistribution(),
}

/**
 * The cross-cutting notification feed. Notifications are raised by the layer
 * that performs the action (repository today, backend later) — never by a page.
 */
export const notificationsService = {
  list: () => repositories.notifications.list(),
  markRead: (id: string) => repositories.notifications.markRead(id),
  markAllRead: () => repositories.notifications.markAllRead(),
}
