/**
 * Team invitations for the signed-in student — the single owner of the
 * accept/decline workflow, shared by My Projects and Team Formation so neither
 * page tracks "did I respond?" in local state.
 */
import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Invitation } from '@/types/domain'

/** @param onRespond Called after a successful response — pass a stable callback. */
export function useInvitations(onRespond?: () => void) {
  const query = useAsync<Invitation[]>(() => projectsService.invitations())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const reload = query.reload

  const respond = useCallback(
    async (invitationId: string, accept: boolean) => {
      setBusy(true)
      setActionError(null)
      try {
        await projectsService.respondToInvitation(invitationId, accept)
        setActionMessage(accept ? 'Invitation accepted.' : 'Invitation declined.')
        reload()
        onRespond?.()
        return true
      } catch (e) {
        setActionError(
          e instanceof Error ? e.message : 'Could not respond to the invitation. Please try again.',
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload, onRespond],
  )

  return {
    invitations: query.data ?? [],
    loading: query.loading,
    error: query.error,
    busy,
    actionError,
    actionMessage,
    dismissError: () => setActionError(null),
    dismissMessage: () => setActionMessage(null),
    respond,
  }
}
