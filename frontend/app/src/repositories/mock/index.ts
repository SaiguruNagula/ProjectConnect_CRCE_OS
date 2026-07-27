/**
 * Mock repository implementations.
 *
 * Each method reads centralized mock data and returns it through `resolve()`
 * (simulated latency) so the app exercises real async states. The 1:1 API
 * endpoint each will call is noted per method — to go live, create an
 * api/ sibling implementing the same interfaces and switch repositories/index.
 */
import { resolve, reject } from '@/services/mock'
import type {
  AdminRepository,
  AnalyticsRepository,
  CreditRepository,
  DashboardRepository,
  FacultyProfileRepository,
  LeaderboardRepository,
  PortfolioRepository,
  ProblemRepository,
  ProfileRepository,
  ProjectRepository,
  ReviewRepository,
  SolutionRepository,
  Repositories,
} from '@/repositories/types'
import type {
  AdminInstitution,
  CreateProblemInput,
  FacultyProfile,
  InstitutionInput,
  Portfolio,
  PortfolioCustomization,
  Problem,
  StudentProfile,
} from '@/types/domain'
import type { Role } from '@/types'
import { MOCK_PROBLEMS } from '@/mocks/problems'
import { MOCK_PROJECTS, PENDING_INVITATIONS, MOCK_TEAMS } from '@/mocks/projects'
import { MOCK_STUDENT_LEADERBOARD, MOCK_FACULTY_LEADERBOARD } from '@/mocks/leaderboard'
import { MOCK_STUDENT_PROFILE } from '@/mocks/profile'
import { MOCK_FACULTY_PROFILE, MOCK_FACULTY_REPUTATION } from '@/mocks/faculty'
import { PORTFOLIO_VERIFIED, MOCK_PORTFOLIO_CUSTOMIZATION } from '@/mocks/portfolio'
import {
  MOCK_CREDIT_TRANSACTIONS,
  CREDIT_BREAKDOWN,
  CREDIT_RULES,
  CREDIT_SUMMARY,
  CREDIT_CATEGORIES,
  CREDIT_PIPELINE,
} from '@/mocks/credits'
import { MOCK_REVIEWS, REVIEW_RUBRIC, REVIEW_STATS } from '@/mocks/reviews'
import { MOCK_SOLUTIONS, SOLUTION_STATS } from '@/mocks/solutions'
import { MOCK_DIRECTORY_USERS, MOCK_INSTITUTIONS } from '@/mocks/directory'
import { MOCK_ADMIN_INSTITUTIONS, INSTITUTIONS_OVERVIEW } from '@/mocks/institutions'
import { ADMIN_DASHBOARD } from '@/mocks/admin-dashboard'
import { INSTITUTION_ANALYTICS } from '@/mocks/principal-dashboard'
import { USERS_OVERVIEW } from '@/mocks/users-overview'
import { MOCK_ACTIVITY, MOCK_DEADLINES, MOCK_NOTIFICATIONS } from '@/mocks/notifications'
import { DASHBOARD_STATS, CREDIT_TREND, DEPARTMENT_DISTRIBUTION } from '@/mocks/analytics'

/** In-session problem store so a freshly published problem shows up in Open Problems. */
let problemStore: Problem[] = [...MOCK_PROBLEMS]
/** In-session drafts — persisted authoring state that is NOT yet public. */
const problemDrafts: CreateProblemInput[] = []

/** Compose a read-model Problem from the create request (mirrors the future POST mapping). */
function composeProblem(input: CreateProblemInput): Problem {
  const start = new Date(input.registrationDate)
  const end = new Date(input.deadlineDate)
  const weeks = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    ? 0
    : Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)))
  return {
    id: `p-${Date.now()}`,
    title: input.title,
    summary: input.summary,
    department: input.department,
    difficulty: input.difficulty,
    skills: input.skills,
    facultyName: input.facultyName,
    teamSize: input.teamSize,
    currentTeamCount: 0,
    timelineWeeks: weeks,
    creditReward: input.baseCredits,
    applicantsCount: 0,
    solutionsCount: 0,
    endDate: input.deadlineDate,
    attachments: [],
    timeline: [
      { label: 'Registration Open', date: input.registrationDate, done: false },
      { label: 'Final Submission', date: input.deadlineDate, done: false },
    ],
    status: 'open',
    bookmarked: false,
  }
}

const problems: ProblemRepository = {
  list: () => resolve(problemStore), // GET /api/v1/problems
  get: (id) => resolve(problemStore.find((p) => p.id === id) ?? null), // GET /api/v1/problems/{id}
  create: (input) => {
    // POST /api/v1/problems — publish; prepend so it surfaces in Open Problems this session.
    const problem = composeProblem(input)
    problemStore = [problem, ...problemStore]
    return resolve(problem)
  },
  saveDraft: (input) => {
    // POST /api/v1/problems (status=draft) — kept out of the public list.
    problemDrafts.unshift(input)
    return resolve(undefined)
  },
}

const projects: ProjectRepository = {
  list: () => resolve(MOCK_PROJECTS), // GET /api/v1/projects
  get: (id) => resolve(MOCK_PROJECTS.find((p) => p.id === id) ?? null), // GET /api/v1/projects/{id}
  invitations: () => resolve(PENDING_INVITATIONS), // GET /api/v1/teams/invitations
  teams: () => resolve(MOCK_TEAMS), // GET /api/v1/teams
}

const leaderboard: LeaderboardRepository = {
  students: () => resolve(MOCK_STUDENT_LEADERBOARD), // GET /api/v1/leaderboard/students
  faculty: () => resolve(MOCK_FACULTY_LEADERBOARD), // GET /api/v1/leaderboard/faculty
}

/** In-session source of truth for the editable student identity. */
let profileStore: StudentProfile = structuredClone(MOCK_STUDENT_PROFILE)

const profile: ProfileRepository = {
  get: (_userId) => resolve(profileStore), // GET /api/v1/students/me/profile
  update: (patch) => {
    // PATCH /api/v1/students/me/profile — mock persists in-session.
    profileStore = {
      ...profileStore,
      ...patch,
      visibility: { ...profileStore.visibility, ...patch.visibility },
    }
    return resolve(profileStore)
  },
}

/** In-session source of truth for the editable faculty identity. */
let facultyProfileStore: FacultyProfile = structuredClone(MOCK_FACULTY_PROFILE)

const facultyProfile: FacultyProfileRepository = {
  get: () => resolve(facultyProfileStore), // GET /api/v1/faculty/me/profile
  update: (patch) => {
    // PATCH /api/v1/faculty/me/profile — mock persists in-session.
    facultyProfileStore = { ...facultyProfileStore, ...patch }
    return resolve(facultyProfileStore)
  },
  // GET /api/v1/faculty/me/reputation — verified/generated, read-only.
  reputation: () => resolve(MOCK_FACULTY_REPUTATION),
}

/**
 * Compose the portfolio view model: verified data + the editable identity read
 * from the profile source of truth (never a duplicate copy). Visibility flags
 * the student owns are enforced here — private data is stripped before it can
 * be rendered publicly.
 */
function composePortfolio(p: StudentProfile): Portfolio {
  return {
    ...PORTFOLIO_VERIFIED,
    userId: p.userId,
    name: p.name,
    avatarInitials: p.avatarInitials,
    headline: p.headline,
    tagline: p.tagline,
    bio: p.bio,
    department: p.department,
    batch: p.batch,
    rollNumber: p.rollNumber,
    pronouns: p.pronouns,
    location: p.location,
    institutionalEmail: p.visibility.showContact ? p.institutionalEmail : undefined,
    github: p.visibility.showSocials ? p.github : undefined,
    linkedin: p.visibility.showSocials ? p.linkedin : undefined,
    personalSkills: p.personalSkills,
  }
}

/** In-session store for the student's own portfolio curation (owner-editable). */
let portfolioCustomization: PortfolioCustomization = structuredClone(MOCK_PORTFOLIO_CUSTOMIZATION)

const portfolio: PortfolioRepository = {
  // GET /api/v1/portfolio/{userId} — assembled from the profile + verified modules.
  get: (_userId) => resolve(composePortfolio(profileStore)),
  // GET /api/v1/portfolio/me/customization
  getCustomization: () => resolve(portfolioCustomization),
  updateCustomization: (patch) => {
    // PATCH /api/v1/portfolio/me/customization — mock persists in-session.
    portfolioCustomization = {
      ...portfolioCustomization,
      ...patch,
      sections: { ...portfolioCustomization.sections, ...patch.sections },
    }
    return resolve(portfolioCustomization)
  },
}

const credits: CreditRepository = {
  history: () => resolve(MOCK_CREDIT_TRANSACTIONS), // GET /api/v1/credits/history
  breakdown: () => resolve(CREDIT_BREAKDOWN), // GET /api/v1/credits/me
  rules: () => resolve(CREDIT_RULES), // GET /api/v1/credits/rules
  summary: () => resolve(CREDIT_SUMMARY), // GET /api/v1/credits/summary
  categories: () => resolve(CREDIT_CATEGORIES), // GET /api/v1/credits/categories
  pipeline: () => resolve(CREDIT_PIPELINE), // GET /api/v1/credits/pipeline
}

const reviews: ReviewRepository = {
  list: () => resolve(MOCK_REVIEWS), // GET /api/v1/reviews
  rubric: () => resolve(REVIEW_RUBRIC), // GET /api/v1/reviews/{id}/rubric
  stats: () => resolve(REVIEW_STATS), // GET /api/v1/reviews/stats
  submitDecision: (input) => {
    // POST /api/v1/reviews/{id}/decision — mock returns the updated submission.
    const found = MOCK_REVIEWS.find((r) => r.id === input.submissionId)
    if (!found) return reject('Submission not found')
    return resolve({
      ...found,
      status: input.decision,
      creditsAwarded: input.decision === 'approved' ? input.creditsAwarded : found.creditsAwarded,
    })
  },
}

const solutions: SolutionRepository = {
  list: () => resolve(MOCK_SOLUTIONS), // GET /api/v1/solutions
  stats: () => resolve(SOLUTION_STATS), // GET /api/v1/solutions/stats
}

/** In-session source of truth for the admin institution directory. */
let institutionStore: AdminInstitution[] = structuredClone(MOCK_ADMIN_INSTITUTIONS)

/** Apply an edit payload to an institution (mirrors the future POST/PATCH body mapping). */
function applyInstitutionInput(base: AdminInstitution, input: InstitutionInput): AdminInstitution {
  const principalName = input.principalName?.trim()
  const trimmed = (value?: string) => value?.trim() || undefined
  return {
    ...base,
    name: input.name.trim(),
    fullName: input.fullName.trim(),
    code: input.code.trim().toUpperCase(),
    type: input.type.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    website: trimmed(input.website),
    supportEmail: trimmed(input.supportEmail),
    address: trimmed(input.address),
    principal: principalName
      ? {
          name: principalName,
          email: input.principalEmail?.trim() ?? '',
          // Re-assigning a principal clears the verified flag; the backend re-verifies.
          verified: principalName === base.principal?.name && base.principal.verified,
        }
      : undefined,
  }
}

/** A newly created institution starts unverified with an empty ecosystem. */
const NEW_INSTITUTION: Omit<AdminInstitution, 'id'> = {
  name: '',
  fullName: '',
  code: '',
  type: '',
  city: '',
  state: '',
  status: 'pending',
  tier: 'CAMPUS_LEVEL_02',
  students: 0,
  faculty: 0,
  projects: 0,
  credits: 0,
}

const admin: AdminRepository = {
  users: () => resolve(MOCK_DIRECTORY_USERS), // GET /api/v1/admin/users
  institutions: () => resolve(MOCK_INSTITUTIONS), // GET /api/v1/admin/departments
  institutionDirectory: () => resolve(institutionStore), // GET /api/v1/admin/institutions
  institutionsOverview: () => resolve(INSTITUTIONS_OVERVIEW), // GET /api/v1/admin/institutions/overview
  saveInstitution: (input, id) => {
    if (!id) {
      // POST /api/v1/admin/institutions — prepend so it surfaces immediately.
      const created = applyInstitutionInput({ ...NEW_INSTITUTION, id: `in-${Date.now()}` }, input)
      institutionStore = [created, ...institutionStore]
      return resolve(created)
    }
    // PATCH /api/v1/admin/institutions/{id}
    const existing = institutionStore.find((i) => i.id === id)
    if (!existing) return reject('Institution not found')
    const updated = applyInstitutionInput(existing, input)
    institutionStore = institutionStore.map((i) => (i.id === id ? updated : i))
    return resolve(updated)
  },
  setInstitutionStatus: (id, status) => {
    // PATCH /api/v1/admin/institutions/{id}/status
    const existing = institutionStore.find((i) => i.id === id)
    if (!existing) return reject('Institution not found')
    const updated: AdminInstitution = {
      ...existing,
      status,
      // Verifying an institution also verifies the principal identity on record.
      principal: existing.principal && { ...existing.principal, verified: status === 'active' },
    }
    institutionStore = institutionStore.map((i) => (i.id === id ? updated : i))
    return resolve(updated)
  },
  dashboard: () => resolve(ADMIN_DASHBOARD), // GET /api/v1/admin/dashboard
  usersOverview: () => resolve(USERS_OVERVIEW), // GET /api/v1/admin/users/overview
}

const analytics: AnalyticsRepository = {
  institution: () => resolve(INSTITUTION_ANALYTICS), // GET /api/v1/analytics/institution
}

const dashboard: DashboardRepository = {
  stats: (role: Role) => resolve(DASHBOARD_STATS[role]),
  activity: () => resolve(MOCK_ACTIVITY),
  deadlines: () => resolve(MOCK_DEADLINES),
  notifications: () => resolve(MOCK_NOTIFICATIONS), // GET /api/v1/notifications
  creditTrend: () => resolve(CREDIT_TREND),
  departmentDistribution: () => resolve(DEPARTMENT_DISTRIBUTION), // GET /api/v1/analytics/departments
}

export const mockRepositories: Repositories = {
  problems,
  projects,
  leaderboard,
  profile,
  facultyProfile,
  portfolio,
  credits,
  reviews,
  solutions,
  admin,
  analytics,
  dashboard,
}
