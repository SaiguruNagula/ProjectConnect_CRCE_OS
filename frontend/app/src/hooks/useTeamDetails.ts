/**
 * Team Details for one team — the read model and roster actions behind the
 * contextual Team Details dialog. There is no Team Profile page; every surface
 * that needs the roster (Problem Details, My Projects, the submission stages,
 * Faculty Review) opens this instead.
 *
 * The hook owns every mutation (invite, remove, leave) and routes it through
 * projectsService, so the dialog stays a pure renderer.
 * Component → Hook → Service → Repository → API.
 *
 * @param teamId The team to load. Pass null/undefined to stay idle — the dialog
 * mounts before a team is chosen, and solo entries have no team at all.
 */
import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { InviteMemberInput, Team } from '@/types/domain'

export function useTeamDetails(teamId?: string | null) {
  const { data, loading, error, reload } = useAsync<Team | null>(
    () => (teamId ? projectsService.team(teamId) : Promise.resolve(null)),
    [teamId],
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string, fallback: string) => {
      setBusy(true)
      setActionError(null)
      try {
        await action()
        setActionMessage(message)
        reload()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallback)
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload],
  )

  const inviteMember = useCallback(
    (input: InviteMemberInput) => {
      if (!teamId) return Promise.resolve(false)
      return run(
        () => projectsService.inviteMember(teamId, input),
        `Invitation sent to ${input.email}.`,
        'Could not send the invitation. Please try again.',
      )
    },
    [teamId, run],
  )

  const removeMember = useCallback(
    (memberId: string, memberName: string) => {
      if (!teamId) return Promise.resolve(false)
      return run(
        () => projectsService.removeMember(teamId, memberId),
        `${memberName} was removed from the team.`,
        'Could not remove that member. Please try again.',
      )
    },
    [teamId, run],
  )

  const leaveTeam = useCallback(() => {
    if (!teamId) return Promise.resolve(false)
    return run(
      () => projectsService.leaveTeam(teamId),
      'You have left the team.',
      'Could not leave the team. Please try again.',
    )
  }, [teamId, run])

  return {
    team: data ?? null,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    inviteMember,
    removeMember,
    leaveTeam,
    reload,
  }
}
