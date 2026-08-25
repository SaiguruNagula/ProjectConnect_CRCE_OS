/**
 * Project + team repository — live (Phase 7).
 *
 * One repository, three routers: teams (`/teams`), applications
 * (`/problems/{id}/applications`) and the project space (`/projects`). That
 * split is the backend's; this contract has always been the student's single
 * "my work" surface, so it stays one object.
 *
 * Two methods return something the endpoint does not: applying and withdrawing
 * both answer with the project (or nothing), while the pages that call them
 * re-render a problem card. Both re-read the problem afterwards rather than
 * patching a local copy — the backend owns `applicationStatus`.
 */
import { ApiError, apiClient } from '@/api/client'
import { camelize, decamelize } from '@/api/case'
import { fetchProblem } from '@/repositories/api/problems.repository'
import type { ProjectRepository } from '@/repositories/types'
import type {
  ApplicationInput,
  CreateTeamInput,
  FinalSubmission,
  IdeaSubmission,
  Invitation,
  InviteMemberInput,
  JoinRequest,
  PocSubmission,
  Project,
  ProjectJourney,
  Team,
} from '@/types/domain'

/**
 * A read that answers "not there" with null instead of an exception. Exported
 * for the review repository, which reads the same journey from the reviewer's
 * side and wants the same answer when the project is gone.
 */
export async function optional<T>(path: string): Promise<T | null> {
  try {
    const { data } = await apiClient.get<unknown>(path)
    return camelize<T>(data)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** PUT one stage of the journey; `submit` is what sends it for review. */
async function saveStage(
  projectId: string,
  stage: 'idea' | 'proof-of-concept' | 'final',
  data: IdeaSubmission | PocSubmission | FinalSubmission,
  submit: boolean,
): Promise<ProjectJourney> {
  const response = await apiClient.put<unknown>(
    `/projects/${projectId}/${stage}`,
    decamelize(data),
    { submit },
  )
  return camelize<ProjectJourney>(response.data)
}

export const projectsApiRepository: ProjectRepository = {
  list: async () => camelize<Project[]>((await apiClient.get<unknown>('/projects')).data),
  get: (id: string) => optional<Project>(`/projects/${id}`),
  invitations: async () =>
    camelize<Invitation[]>((await apiClient.get<unknown>('/teams/invitations')).data),

  teams: async (problemId?: string) => {
    const { data } = await apiClient.get<unknown>('/teams', { problem_id: problemId })
    return camelize<Team[]>(data)
  },
  team: (teamId: string) => optional<Team>(`/teams/${teamId}`),
  createTeam: async (input: CreateTeamInput) => {
    const { data } = await apiClient.post<unknown>('/teams', decamelize(input))
    return camelize<Team>(data)
  },
  inviteMember: async (teamId: string, input: InviteMemberInput) => {
    const { data } = await apiClient.post<unknown>(`/teams/${teamId}/invitations`, input)
    return camelize<Team>(data)
  },
  removeMember: async (teamId: string, memberId: string) => {
    const { data } = await apiClient.delete<unknown>(`/teams/${teamId}/members/${memberId}`)
    return camelize<Team>(data)
  },
  // Null once the last member leaves: the team is disbanded, not emptied.
  leaveTeam: async (teamId: string) => {
    const { data } = await apiClient.delete<unknown>(`/teams/${teamId}/members/me`)
    return data === null ? null : camelize<Team>(data)
  },
  requestToJoin: async (teamId: string, message: string) => {
    const { data } = await apiClient.post<unknown>(`/teams/${teamId}/join-requests`, { message })
    return camelize<Team>(data)
  },
  joinRequests: async () =>
    camelize<JoinRequest[]>((await apiClient.get<unknown>('/teams/mine/join-requests')).data),
  respondToJoinRequest: async (requestId: string, accept: boolean) => {
    const verb = accept ? 'accept' : 'reject'
    const { data } = await apiClient.post<unknown>(`/teams/join-requests/${requestId}/${verb}`)
    return camelize<JoinRequest[]>(data)
  },
  respondToInvitation: async (invitationId: string, accept: boolean) => {
    const verb = accept ? 'accept' : 'decline'
    const { data } = await apiClient.post<unknown>(`/teams/invitations/${invitationId}/${verb}`)
    return camelize<Invitation[]>(data)
  },

  applyToProblem: async (problemId: string, input: ApplicationInput) => {
    await apiClient.post(`/problems/${problemId}/applications`, decamelize(input))
    return fetchProblem(problemId)
  },
  withdrawApplication: async (problemId: string) => {
    await apiClient.delete(`/problems/${problemId}/applications/me`)
    return fetchProblem(problemId)
  },

  journey: (projectId: string) => optional<ProjectJourney>(`/projects/${projectId}/journey`),
  saveIdea: (projectId, data, submit) => saveStage(projectId, 'idea', data, submit),
  savePoc: (projectId, data, submit) => saveStage(projectId, 'proof-of-concept', data, submit),
  saveFinal: (projectId, data, submit) => saveStage(projectId, 'final', data, submit),
}
