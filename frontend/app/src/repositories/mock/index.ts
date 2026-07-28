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
  NotificationRepository,
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
  Invitation,
  JoinRequest,
  LeaderboardEntry,
  Notification,
  NotificationKind,
  Portfolio,
  PortfolioCustomization,
  Problem,
  ProblemDraft,
  ProblemSuggestion,
  Project,
  ProjectJourney,
  StageState,
  StageStatus,
  StudentProfile,
  SubmissionStage,
  Team,
} from '@/types/domain'
import type { Role } from '@/types'
import { MOCK_PROBLEMS } from '@/mocks/problems'
import { MOCK_PROJECTS, PENDING_INVITATIONS, MOCK_TEAMS, type ProjectRecord } from '@/mocks/projects'
import {
  EMPTY_JOURNEY,
  MOCK_JOIN_REQUESTS,
  MOCK_JOURNEYS,
  MOCK_SUGGESTIONS,
  type JourneyRecord,
} from '@/mocks/submissions'
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
import {
  DASHBOARD_STATS,
  CREDIT_TREND,
  DEPARTMENT_DISTRIBUTION,
  CAMPUS_IMPACT,
} from '@/mocks/analytics'
import { buildPath, ROUTES, withQuery, QUERY_PARAMS } from '@/constants/routes'

/**
 * In-session notification feed. The backend raises these server-side; the mock
 * raises them from the same mutations, so every module that performs an action
 * produces a notification without any page owning that logic.
 */
let notificationStore: Notification[] = structuredClone(MOCK_NOTIFICATIONS)

function raise(kind: NotificationKind, title: string, message: string, link?: string): void {
  notificationStore = [
    { id: `n-${Date.now()}`, kind, title, message, timestamp: new Date().toISOString(), read: false, link },
    ...notificationStore,
  ]
}

/** In-session problem store so a freshly published problem shows up in Open Problems. */
let problemStore: Problem[] = [...MOCK_PROBLEMS]
/** In-session drafts — persisted authoring state that is NOT yet public. */
let problemDrafts: ProblemDraft[] = []

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

/** In-session suggestion queue — student-raised problems awaiting a mentor. */
let suggestionStore: ProblemSuggestion[] = structuredClone(MOCK_SUGGESTIONS)

/** Does a problem match the free-text part of a catalog query? */
function matchesSearch(problem: Problem, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    problem.title.toLowerCase().includes(q) ||
    problem.summary.toLowerCase().includes(q) ||
    problem.department.toLowerCase().includes(q) ||
    problem.facultyName.toLowerCase().includes(q)
  )
}

/**
 * Publish an approved suggestion as an open problem. The nominated mentor
 * becomes the problem's faculty owner; defaults mirror what the backend applies
 * when a suggestion carries no scheduling detail.
 */
function problemFromSuggestion(suggestion: ProblemSuggestion): Problem {
  const today = new Date()
  const close = new Date(today.getTime() + 84 * 24 * 3600 * 1000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return {
    id: `p-${Date.now()}`,
    title: suggestion.input.title,
    summary: suggestion.input.description,
    department: suggestion.input.category,
    difficulty: 'Intermediate',
    skills: [],
    facultyName: suggestion.mentorName,
    facultyId: suggestion.input.mentorId,
    teamSize: 4,
    currentTeamCount: 0,
    timelineWeeks: 12,
    creditReward: 200,
    applicantsCount: 0,
    solutionsCount: 0,
    endDate: iso(close),
    attachments: suggestion.input.referenceLinks.map((url, i) => ({
      name: `Reference ${i + 1}`,
      type: 'Link',
      url,
    })),
    timeline: [
      { label: 'Registration Open', date: iso(today), done: false },
      { label: 'Final Submission', date: iso(close), done: false },
    ],
    status: 'open',
    bookmarked: false,
  }
}

const problems: ProblemRepository = {
  list: () => resolve(problemStore), // GET /api/v1/problems
  page: (query) => {
    // GET /api/v1/problems?page&limit&search&department&saved_only&sort
    const matched = problemStore.filter(
      (p) =>
        (!query.department || p.department === query.department) &&
        (!query.savedOnly || p.bookmarked) &&
        matchesSearch(p, query.search ?? ''),
    )
    const sorted =
      query.sort === 'credits'
        ? [...matched].sort((a, b) => b.creditReward - a.creditReward)
        : matched
    const limit = Math.max(1, query.limit)
    const totalPages = Math.max(1, Math.ceil(sorted.length / limit))
    const page = Math.min(Math.max(1, query.page), totalPages)
    return resolve({
      items: sorted.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total: sorted.length,
      totalPages,
      // Facets and counters describe the whole catalog, not the current page —
      // otherwise a filter would erase the chips needed to undo it.
      departments: Array.from(new Set(problemStore.map((p) => p.department))).sort(),
      stats: {
        problems: problemStore.length,
        departments: new Set(problemStore.map((p) => p.department)).size,
        teams: problemStore.filter((p) => p.currentTeamCount > 0).length,
      },
    })
  },
  get: (id) => resolve(problemStore.find((p) => p.id === id) ?? null), // GET /api/v1/problems/{id}
  // GET /api/v1/mentors — faculty a student may nominate on a suggestion.
  mentors: () =>
    resolve(
      MOCK_DIRECTORY_USERS.filter((u) => u.role === 'faculty' && u.status === 'active').map((u) => ({
        id: u.id,
        name: u.name,
        department: u.department,
      })),
    ),
  suggestions: () => resolve(suggestionStore), // GET /api/v1/problem-suggestions
  saveSuggestion: (input, submit, id) => {
    // POST /api/v1/problem-suggestions (new) | PUT .../{id} (draft or resubmit)
    const mentor = MOCK_DIRECTORY_USERS.find((u) => u.id === input.mentorId)
    if (!mentor) return reject('Select a mentor to review your suggestion.')
    const existing = id ? suggestionStore.find((s) => s.id === id) : undefined
    if (id && !existing) return reject('Suggestion not found')
    if (existing && existing.status !== 'draft' && existing.status !== 'changes_requested') {
      return reject('This suggestion is already with your mentor.')
    }
    const saved: ProblemSuggestion = {
      id: existing?.id ?? `ps-${Date.now()}`,
      // A suggestion never publishes itself — submitting only queues mentor review.
      status: submit ? 'pending_mentor_review' : 'draft',
      input,
      mentorName: mentor.name,
      submittedBy: profileStore.name,
      submittedAt: new Date().toISOString(),
      mentorFeedback: submit ? undefined : existing?.mentorFeedback,
    }
    suggestionStore = existing
      ? suggestionStore.map((s) => (s.id === existing.id ? saved : s))
      : [saved, ...suggestionStore]
    if (submit) {
      raise(
        'info',
        'Suggestion sent for review',
        `${saved.input.title} is awaiting ${mentor.name}'s decision.`,
        ROUTES.SHARED.OPEN_PROBLEMS,
      )
    }
    return resolve(saved)
  },
  decideSuggestion: (input) => {
    // POST /api/v1/problem-suggestions/{id}/decision
    const existing = suggestionStore.find((s) => s.id === input.suggestionId)
    if (!existing) return reject('Suggestion not found')
    if (existing.status !== 'pending_mentor_review') {
      return reject('This suggestion is not awaiting review.')
    }
    if (input.decision !== 'approved' && !input.feedback.trim()) {
      return reject('Explain what the student should change.')
    }
    const approved = input.decision === 'approved'
    // Approval is what publishes the problem — this is the only path from a
    // student suggestion into the public Open Problems catalog.
    const published = approved ? problemFromSuggestion(existing) : null
    if (published) problemStore = [published, ...problemStore]
    const updated: ProblemSuggestion = {
      ...existing,
      status: approved ? 'published' : input.decision,
      reviewedAt: new Date().toISOString(),
      mentorFeedback: input.feedback.trim() || undefined,
      publishedProblemId: published?.id,
    }
    suggestionStore = suggestionStore.map((s) => (s.id === updated.id ? updated : s))
    raise(
      approved ? 'success' : input.decision === 'rejected' ? 'warning' : 'info',
      approved ? 'Suggestion published' : `Suggestion ${input.decision.replace('_', ' ')}`,
      `${existing.input.title} — reviewed by ${existing.mentorName}.`,
      published
        ? buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: published.id })
        : ROUTES.SHARED.OPEN_PROBLEMS,
    )
    return resolve(updated)
  },
  create: (input) => {
    // POST /api/v1/problems — publish; prepend so it surfaces in Open Problems this session.
    const problem = composeProblem(input)
    problemStore = [problem, ...problemStore]
    raise(
      'success',
      'Problem published',
      `${problem.title} is now open for applications.`,
      buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problem.id }),
    )
    return resolve(problem)
  },
  saveDraft: (input) => {
    // POST /api/v1/problems (status=draft) — kept out of the public list.
    problemDrafts = [
      { id: `pd-${Date.now()}`, savedAt: new Date().toISOString(), input },
      ...problemDrafts,
    ]
    return resolve(undefined)
  },
  drafts: () => resolve(problemDrafts), // GET /api/v1/problems?status=draft&author=me
  setBookmark: (id, bookmarked) => {
    // PUT/DELETE /api/v1/problems/{id}/bookmark
    const existing = problemStore.find((p) => p.id === id)
    if (!existing) return reject('Problem not found')
    const updated: Problem = { ...existing, bookmarked }
    problemStore = problemStore.map((p) => (p.id === id ? updated : p))
    return resolve(updated)
  },
}

/** In-session stores so team/invitation actions persist across page navigation. */
let projectStore: ProjectRecord[] = structuredClone(MOCK_PROJECTS)
let teamStore: Team[] = structuredClone(MOCK_TEAMS)
let invitationStore: Invitation[] = structuredClone(PENDING_INVITATIONS)
let journeyStore: Record<string, JourneyRecord> = structuredClone(MOCK_JOURNEYS)
let joinRequestStore: JoinRequest[] = structuredClone(MOCK_JOIN_REQUESTS)

function journeyOf(projectId: string): JourneyRecord {
  return journeyStore[projectId] ?? structuredClone(EMPTY_JOURNEY)
}

/**
 * Which stages the student may open. Each unlocks once the previous one has
 * left draft; the Final stage unlocks only for a team faculty has selected.
 */
function unlockedStages(record: JourneyRecord): SubmissionStage[] {
  const stages: SubmissionStage[] = ['idea']
  if (record.idea.status !== 'draft') stages.push('poc')
  if (record.poc.status !== 'draft') stages.push('selection')
  if (record.selection.status === 'selected') stages.push('final')
  return stages
}

/** The stage the student has to act on — work owed comes before work waiting. */
function currentStage(record: JourneyRecord): SubmissionStage {
  if (record.idea.status === 'draft' || record.idea.status === 'changes_requested') return 'idea'
  if (record.poc.status === 'draft' || record.poc.status === 'changes_requested') return 'poc'
  if (record.selection.status !== 'selected') return 'selection'
  return 'final'
}

function stageStatus(record: JourneyRecord, stage: SubmissionStage): StageStatus {
  if (stage === 'selection') return record.selection.status
  return record[stage].status
}

/**
 * The list read model: a stored project joined with the stage it currently sits
 * in, so dashboards and lists never open the journey to work it out.
 */
function withStage(project: ProjectRecord): Project {
  const record = journeyOf(project.id)
  const stage = currentStage(record)
  return { ...project, stage, stageStatus: stageStatus(record, stage) }
}

/** Compose the full journey read model from the project, team, problem and stages. */
function composeJourney(project: ProjectRecord): ProjectJourney {
  const record = journeyOf(project.id)
  const team = project.teamId ? teamStore.find((t) => t.id === project.teamId) : undefined
  const problem = project.problemId ? problemStore.find((p) => p.id === project.problemId) : undefined
  return {
    projectId: project.id,
    title: project.title,
    problemId: project.problemId,
    problemTitle: problem?.title,
    teamId: project.teamId,
    teamName: team?.name ?? 'Individual entry',
    mentorName: project.mentorName,
    members: team?.members ?? project.members,
    currentStage: currentStage(record),
    unlockedStages: unlockedStages(record),
    ...record,
  }
}

/** Apply a stage save and return the recomposed journey, or reject if unknown. */
function saveStage(
  projectId: string,
  apply: (record: JourneyRecord) => JourneyRecord | string,
): Promise<ProjectJourney> {
  const project = projectStore.find((p) => p.id === projectId)
  if (!project) return reject('Project not found')
  const next = apply(journeyOf(projectId))
  if (typeof next === 'string') return reject(next)
  journeyStore = { ...journeyStore, [projectId]: next }
  return resolve(composeJourney(project))
}

/**
 * A stage the student just saved. Submitting moves it straight to `submitted`;
 * the review status that follows is set by faculty, never by the student.
 */
function stageAfterSave<T>(current: StageState<T>, data: T, submit: boolean): StageState<T> {
  const now = new Date().toISOString()
  return submit
    ? { status: 'submitted', data, savedAt: now, submittedAt: now }
    : { ...current, status: 'draft', data, savedAt: now }
}

const projects: ProjectRepository = {
  list: () => resolve(projectStore.map(withStage)), // GET /api/v1/projects
  // GET /api/v1/projects/{id}
  get: (id) => {
    const found = projectStore.find((p) => p.id === id)
    return resolve(found ? withStage(found) : null)
  },
  invitations: () => resolve(invitationStore), // GET /api/v1/teams/invitations
  // GET /api/v1/teams?problem_id=...
  teams: (problemId) =>
    resolve(problemId ? teamStore.filter((t) => t.problemId === problemId) : teamStore),
  createTeam: (input) => {
    // POST /api/v1/teams — the creator becomes the lead; only one team may be `mine`.
    const problem = problemStore.find((p) => p.id === input.problemId)
    const team: Team = {
      id: `t-${Date.now()}`,
      name: input.name.trim(),
      problemId: input.problemId,
      pitch: input.pitch.trim(),
      mine: true,
      openSpots: Math.max(0, (problem?.teamSize ?? input.lookingFor.length + 1) - 1),
      lookingFor: input.lookingFor,
      members: [
        {
          id: profileStore.userId,
          name: profileStore.name,
          role: 'Team Lead',
          avatarInitials: profileStore.avatarInitials,
        },
      ],
    }
    teamStore = [team, ...teamStore.map((t) => (t.mine ? { ...t, mine: false } : t))]
    raise(
      'success',
      'Team created',
      `${team.name} is now recruiting${problem ? ` for ${problem.title}` : ''}.`,
      withQuery(ROUTES.SHARED.TEAM_FORMATION, { [QUERY_PARAMS.PROBLEM]: input.problemId }),
    )
    return resolve(team)
  },
  requestToJoin: (teamId, message) => {
    // POST /api/v1/teams/{id}/join-requests
    const existing = teamStore.find((t) => t.id === teamId)
    if (!existing) return reject('Team not found')
    if (existing.joinRequested) return reject('You have already requested to join this team.')
    if (existing.openSpots === 0) return reject('This team has no open slots.')
    if (!message.trim()) return reject('Tell the team lead what you would contribute.')
    const updated: Team = { ...existing, joinRequested: true }
    teamStore = teamStore.map((t) => (t.id === teamId ? updated : t))
    raise(
      'info',
      'Join request sent',
      `Your request to join ${updated.name} is awaiting the team lead's response.`,
      withQuery(ROUTES.SHARED.TEAM_FORMATION, { [QUERY_PARAMS.PROBLEM]: updated.problemId }),
    )
    return resolve(updated)
  },
  // GET /api/v1/teams/mine/join-requests — visible to the team lead only.
  joinRequests: () => resolve(joinRequestStore),
  respondToJoinRequest: (requestId, accept) => {
    // POST /api/v1/teams/join-requests/{id}/{accept|reject}
    const existing = joinRequestStore.find((r) => r.id === requestId)
    if (!existing) return reject('Join request not found')
    joinRequestStore = joinRequestStore.filter((r) => r.id !== requestId)
    if (accept) {
      // Accepting seats the student and consumes one of the team's open slots.
      teamStore = teamStore.map((t) =>
        t.id === existing.teamId
          ? {
              ...t,
              openSpots: Math.max(0, t.openSpots - 1),
              members: [
                ...t.members,
                {
                  id: existing.studentId,
                  name: existing.studentName,
                  role: 'Member',
                  avatarInitials: existing.avatarInitials,
                },
              ],
            }
          : t,
      )
    }
    raise(
      accept ? 'success' : 'info',
      accept ? 'Join request accepted' : 'Join request rejected',
      `${existing.studentName} — ${existing.teamName}.`,
      ROUTES.SHARED.TEAM_FORMATION,
    )
    return resolve(joinRequestStore)
  },
  respondToInvitation: (invitationId, accept) => {
    // POST /api/v1/teams/invitations/{id}/{accept|decline}
    const existing = invitationStore.find((i) => i.id === invitationId)
    if (!existing) return reject('Invitation not found')
    invitationStore = invitationStore.filter((i) => i.id !== invitationId)
    raise(
      accept ? 'success' : 'info',
      accept ? 'Invitation accepted' : 'Invitation declined',
      `${existing.projectTitle} — invited by ${existing.invitedBy}.`,
      accept ? ROUTES.STUDENT.PROJECTS : undefined,
    )
    return resolve(invitationStore)
  },
  applyToProblem: (problemId, input) => {
    // POST /api/v1/problems/{id}/applications
    const existing = problemStore.find((p) => p.id === problemId)
    if (!existing) return reject('Problem not found')
    if (existing.status === 'closed') return reject('This problem is closed to new applications.')
    if (existing.applicationStatus && existing.applicationStatus !== 'none') {
      return reject('You have already applied to this problem.')
    }
    if (!input.ideaSummary.trim() || !input.approach.trim()) {
      return reject('Describe your idea and how you will approach it.')
    }
    const updated: Problem = {
      ...existing,
      applicantsCount: existing.applicantsCount + 1,
      applicationStatus: input.teamId ? 'team' : 'solo',
    }
    problemStore = problemStore.map((p) => (p.id === problemId ? updated : p))
    raise(
      'success',
      'Application submitted',
      `Your application to ${updated.title} is with ${updated.facultyName}.`,
      buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problemId }),
    )
    return resolve(updated)
  },
  withdrawApplication: (problemId) => {
    // DELETE /api/v1/problems/{id}/applications/me
    const existing = problemStore.find((p) => p.id === problemId)
    if (!existing) return reject('Problem not found')
    const updated: Problem = {
      ...existing,
      applicantsCount: Math.max(0, existing.applicantsCount - 1),
      applicationStatus: 'none',
    }
    problemStore = problemStore.map((p) => (p.id === problemId ? updated : p))
    raise(
      'info',
      'Application withdrawn',
      `You are no longer applying to ${updated.title}.`,
      buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problemId }),
    )
    return resolve(updated)
  },
  // GET /api/v1/projects/{id}/journey
  journey: (projectId) => {
    const found = projectStore.find((p) => p.id === projectId)
    return resolve(found ? composeJourney(found) : null)
  },
  saveIdea: (projectId, data, submit) =>
    // PUT /api/v1/projects/{id}/idea (+ ?submit=true)
    saveStage(projectId, (record) => {
      if (record.idea.status === 'submitted' || record.idea.status === 'under_review') {
        return 'Your idea is already with faculty for review.'
      }
      if (submit) {
        raise(
          'info',
          'Idea submitted',
          `${data.title} is with faculty for review.`,
          buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: projectId }),
        )
      }
      return { ...record, idea: stageAfterSave(record.idea, data, submit) }
    }),
  savePoc: (projectId, data, submit) =>
    // PUT /api/v1/projects/{id}/proof-of-concept (+ ?submit=true)
    saveStage(projectId, (record) => {
      if (record.idea.status === 'draft') return 'Submit your idea before the proof of concept.'
      if (record.poc.status === 'submitted' || record.poc.status === 'under_review') {
        return 'Your proof of concept is already with faculty for review.'
      }
      if (submit) {
        raise(
          'info',
          'Proof of concept submitted',
          'Faculty will review it and decide which proposals go to final development.',
          buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: projectId }),
        )
      }
      return { ...record, poc: stageAfterSave(record.poc, data, submit) }
    }),
  saveFinal: (projectId, data, submit) =>
    // PUT /api/v1/projects/{id}/final (+ ?submit=true)
    saveStage(projectId, (record) => {
      // The gate that makes Stage 4 meaningful — only selected teams build.
      if (record.selection.status !== 'selected') {
        return 'Only teams selected for final development can submit a final project.'
      }
      if (record.final.status === 'approved') return 'Your final project has already been approved.'
      if (record.final.status === 'submitted' || record.final.status === 'under_review') {
        return 'Your final project is already with faculty for review.'
      }
      if (submit) {
        raise(
          'success',
          'Final project submitted',
          'Your final submission is with faculty for approval.',
          buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: projectId }),
        )
      }
      return { ...record, final: stageAfterSave(record.final, data, submit) }
    }),
  decideSelection: (input) =>
    // POST /api/v1/projects/{id}/selection
    saveStage(input.projectId, (record) => {
      if (record.poc.status === 'draft') return 'This team has not submitted a proof of concept yet.'
      if (input.decision !== 'selected' && !input.feedback.trim()) {
        return 'Explain the decision so the team knows what to do next.'
      }
      const selected = input.decision === 'selected'
      raise(
        selected ? 'success' : 'warning',
        selected ? 'Selected for final development' : `Proposal ${input.decision.replace('_', ' ')}`,
        input.feedback.trim() || 'Faculty have reviewed your proof of concept.',
        buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: input.projectId }),
      )
      return {
        ...record,
        // Selecting a team closes out its proof of concept; asking for changes
        // sends the team back to Stage 2 with the feedback attached.
        poc:
          input.decision === 'changes_requested'
            ? { ...record.poc, status: 'changes_requested', facultyFeedback: input.feedback.trim() }
            : selected
              ? { ...record.poc, status: 'approved' }
              : record.poc,
        selection: {
          status: input.decision,
          feedback: input.feedback.trim() || undefined,
          decidedBy: profileStore.name,
          decidedAt: new Date().toISOString(),
        },
      }
    }),
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
    // Joined the same way the API will: the project rows plus their stage.
    projects: projectStore.map(withStage),
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

/**
 * Another member's public portfolio, composed from the ranking data the mock
 * actually has. Only verified, public-by-definition values are exposed — no
 * contact details, socials or private identity fields.
 */
function composeFromLeaderboard(entry: LeaderboardEntry): Portfolio {
  const faculty = entry.role === 'faculty'
  return {
    userId: entry.id,
    name: entry.name,
    headline: entry.badge,
    tagline: `${entry.badge} | ${entry.department}`,
    bio: faculty
      ? `Faculty mentor in ${entry.department}, guiding ${entry.contributions} student teams across the CRCE innovation ecosystem.`
      : `Student innovator in ${entry.department} with ${entry.contributions} verified contributions.`,
    department: entry.department,
    avatarInitials: entry.avatarInitials,
    facultyValidationCount: 0,
    hallOfFame: [entry.badge],
    totalCredits: entry.credits,
    globalRank: entry.rank,
    verifiedSolutionsCount: 0,
    projectsBuilt: entry.contributions,
    skills: [],
    projects: [],
    solutions: [],
    research: [],
    hackathons: [],
    certificates: [],
    achievements: [],
    timeline: [],
  }
}

/** In-session store for the student's own portfolio curation (owner-editable). */
let portfolioCustomization: PortfolioCustomization = structuredClone(MOCK_PORTFOLIO_CUSTOMIZATION)

const portfolio: PortfolioRepository = {
  // GET /api/v1/portfolio/{userId} — assembled from the profile + verified modules.
  get: (userId) => {
    if (userId === 'me' || userId === profileStore.userId) {
      return resolve(composePortfolio(profileStore))
    }
    const entry = [...MOCK_STUDENT_LEADERBOARD, ...MOCK_FACULTY_LEADERBOARD].find(
      (e) => e.id === userId,
    )
    return entry ? resolve(composeFromLeaderboard(entry)) : reject('Portfolio not found')
  },
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
    const updated = {
      ...found,
      status: input.decision,
      creditsAwarded: input.decision === 'approved' ? input.creditsAwarded : found.creditsAwarded,
    }
    raise(
      input.decision === 'approved' ? 'success' : 'warning',
      `Review ${input.decision.replace('_', ' ')}`,
      `${found.projectTitle} — ${found.milestone}${
        input.decision === 'approved' ? ` (+${input.creditsAwarded} credits)` : ''
      }.`,
      ROUTES.SHARED.REVIEW_ENGINE,
    )
    return resolve(updated)
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
  campusImpact: () => resolve(CAMPUS_IMPACT), // GET /api/v1/analytics/campus-impact
}

const dashboard: DashboardRepository = {
  stats: (role: Role) => resolve(DASHBOARD_STATS[role]),
  activity: () => resolve(MOCK_ACTIVITY),
  deadlines: () => resolve(MOCK_DEADLINES),
  creditTrend: () => resolve(CREDIT_TREND),
  departmentDistribution: () => resolve(DEPARTMENT_DISTRIBUTION), // GET /api/v1/analytics/departments
}

const notifications: NotificationRepository = {
  list: () => resolve(notificationStore), // GET /api/v1/notifications
  markRead: (id) => {
    // PATCH /api/v1/notifications/{id}/read
    notificationStore = notificationStore.map((n) => (n.id === id ? { ...n, read: true } : n))
    return resolve(notificationStore)
  },
  markAllRead: () => {
    // POST /api/v1/notifications/read-all
    notificationStore = notificationStore.map((n) => (n.read ? n : { ...n, read: true }))
    return resolve(notificationStore)
  },
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
  notifications,
}
