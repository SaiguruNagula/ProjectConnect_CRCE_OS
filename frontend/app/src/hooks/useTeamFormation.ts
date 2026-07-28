/**
 * Team Formation state for one problem — loads the problem in context plus its
 * teams and the student's invitations, owns discovery filters, and routes every
 * action (create team, request to join, apply, withdraw, respond to invitation)
 * through projectsService. The page renders; it holds no mutation state
 * (Component → Hook → Service → Repository → API).
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useInvitations } from '@/hooks/useInvitations'
import { problemsService, projectsService } from '@/services/catalog.service'
import type { ApplicationInput, CreateTeamInput, JoinRequest, Problem, Team } from '@/types/domain'

export interface TeamFilters {
  query: string
  /** Empty string means "all roles". */
  role: string
}

const NO_FILTERS: TeamFilters = { query: '', role: '' }

function matches(team: Team, filters: TeamFilters): boolean {
  const q = filters.query.trim().toLowerCase()
  return (
    (!filters.role || team.lookingFor.includes(filters.role)) &&
    (!q ||
      team.name.toLowerCase().includes(q) ||
      team.pitch.toLowerCase().includes(q) ||
      team.members.some((m) => m.name.toLowerCase().includes(q)))
  )
}

/**
 * @param problemId The problem being staffed. When omitted the first open
 * problem is used, so /team remains browsable without context.
 */
export function useTeamFormation(problemId?: string) {
  const problems = useAsync<Problem[]>(() => problemsService.list())
  const [filters, setFilters] = useState<TeamFilters>(NO_FILTERS)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const problem = useMemo(() => {
    const all = problems.data ?? []
    if (problemId) return all.find((p) => p.id === problemId) ?? null
    return all.find((p) => p.status === 'open') ?? all[0] ?? null
  }, [problems.data, problemId])

  const activeProblemId = problem?.id
  const teamsQuery = useAsync<Team[]>(
    () => (activeProblemId ? projectsService.teams(activeProblemId) : Promise.resolve([])),
    [activeProblemId],
  )

  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data])
  const myTeam = useMemo(() => teams.find((t) => t.mine) ?? null, [teams])
  const available = useMemo(() => teams.filter((t) => !t.mine), [teams])

  // Accepting an invitation changes team membership — refresh the roster too.
  const invitationsState = useInvitations(teamsQuery.reload)
  const invitations = invitationsState.invitations

  // Requests waiting on the student's own team; only a lead ever sees rows here.
  const joinRequestsQuery = useAsync<JoinRequest[]>(() => projectsService.joinRequests())

  /** Filter options come from the data, never a hardcoded list. */
  const roles = useMemo(
    () => Array.from(new Set(available.flatMap((t) => t.lookingFor))).sort(),
    [available],
  )

  const rows = useMemo(() => available.filter((t) => matches(t, filters)), [available, filters])

  const setFilter = useCallback(
    (key: keyof TeamFilters, value: string) =>
      setFilters((current) => ({ ...current, [key]: value })),
    [],
  )

  const reloadProblems = problems.reload
  const reloadTeams = teamsQuery.reload

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string, fallback: string, after: () => void) => {
      setBusy(true)
      setActionError(null)
      try {
        await action()
        setActionMessage(message)
        after()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallback)
        return false
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const createTeam = useCallback(
    (input: Omit<CreateTeamInput, 'problemId'>) => {
      if (!activeProblemId) return Promise.resolve(false)
      return run(
        () => projectsService.createTeam({ ...input, problemId: activeProblemId }),
        `${input.name} created — invite students to fill your open roles.`,
        'Could not create the team. Please try again.',
        reloadTeams,
      )
    },
    [activeProblemId, run, reloadTeams],
  )

  const requestToJoin = useCallback(
    (teamId: string, message: string) =>
      run(
        () => projectsService.requestToJoin(teamId, message),
        'Join request sent to the team lead.',
        'Could not send the join request. Please try again.',
        reloadTeams,
      ),
    [run, reloadTeams],
  )

  const reloadJoinRequests = joinRequestsQuery.reload

  const respondToJoinRequest = useCallback(
    (requestId: string, accept: boolean) =>
      run(
        () => projectsService.respondToJoinRequest(requestId, accept),
        accept ? 'Request accepted — they are on the team.' : 'Request rejected.',
        'Could not respond to the request. Please try again.',
        () => {
          reloadJoinRequests()
          reloadTeams()
        },
      ),
    [run, reloadJoinRequests, reloadTeams],
  )

  /**
   * Apply to the problem in context. `asTeam` picks the route — the student's
   * own team, or solo — and `details` carries the idea being proposed.
   */
  const apply = useCallback(
    (asTeam: boolean, details: Omit<ApplicationInput, 'teamId'>) => {
      if (!activeProblemId) return Promise.resolve(false)
      return run(
        () =>
          projectsService.applyToProblem(activeProblemId, {
            ...details,
            teamId: asTeam ? myTeam?.id : undefined,
          }),
        asTeam ? `Applied as ${myTeam?.name ?? 'your team'}.` : 'Applied individually.',
        'Could not submit the application. Please try again.',
        reloadProblems,
      )
    },
    [activeProblemId, myTeam, run, reloadProblems],
  )

  const withdraw = useCallback(() => {
    if (!activeProblemId) return Promise.resolve(false)
    return run(
      () => projectsService.withdrawApplication(activeProblemId),
      'Application withdrawn.',
      'Could not withdraw the application. Please try again.',
      reloadProblems,
    )
  }, [activeProblemId, run, reloadProblems])

  return {
    problem,
    myTeam,
    rows,
    roles,
    invitations,
    /** Only a team lead has rows here — the backend scopes them to the caller. */
    joinRequests: joinRequestsQuery.data ?? [],
    filters,
    setFilter,
    loading: problems.loading || teamsQuery.loading,
    error: problems.error ?? teamsQuery.error,
    busy: busy || invitationsState.busy,
    actionError: actionError ?? invitationsState.actionError,
    actionMessage: actionMessage ?? invitationsState.actionMessage,
    dismissError: () => {
      setActionError(null)
      invitationsState.dismissError()
    },
    dismissMessage: () => {
      setActionMessage(null)
      invitationsState.dismissMessage()
    },
    createTeam,
    requestToJoin,
    respondToJoinRequest,
    apply,
    withdraw,
    respondToInvitation: invitationsState.respond,
  }
}
