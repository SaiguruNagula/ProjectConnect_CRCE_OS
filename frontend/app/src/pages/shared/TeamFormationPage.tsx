/**
 * Team Formation. Create-team form (React Hook Form + Zod validation) plus
 * pending invitations with local accept/reject. No backend — submissions resolve
 * locally; wiring to the service is a one-line change later.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Invitation } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const teamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  idea: z.string().min(10, 'Describe your idea in at least 10 characters'),
  lookingFor: z.string().min(2, 'List at least one role or skill'),
})

type TeamForm = z.infer<typeof teamSchema>

type InviteState = Record<string, 'accepted' | 'rejected'>

export function TeamFormationPage() {
  const { data: invitations } = useAsync<Invitation[]>(() => projectsService.invitations())
  const [created, setCreated] = useState<string | null>(null)
  const [inviteState, setInviteState] = useState<InviteState>({})

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeamForm>({ resolver: zodResolver(teamSchema) })

  const onSubmit = (values: TeamForm) => {
    // ponytail: resolves locally for the demo; swap to teamsService.create() later.
    setCreated(values.name)
    reset()
  }

  const fieldError = (msg?: string) =>
    msg ? <p className="text-xs text-error" role="alert">{msg}</p> : null

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Team Formation" subtitle="Start a team or respond to invitations." />

      <div className="grid gap-lg lg:grid-cols-2">
        {/* Create team */}
        <Card className="flex flex-col gap-md">
          <h2 className="text-base font-semibold text-on-surface">Create a team</h2>
          {created && (
            <div className="flex items-center gap-xs rounded-lg bg-[#e6f4ea] px-sm py-xs text-sm text-[#1e7a3d]" role="status">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
              Team “{created}” created.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-sm" noValidate>
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Team name</span>
              <input
                {...register('name')}
                className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                aria-invalid={!!errors.name}
              />
              {fieldError(errors.name?.message)}
            </label>
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Project idea</span>
              <textarea
                {...register('idea')}
                rows={3}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                aria-invalid={!!errors.idea}
              />
              {fieldError(errors.idea?.message)}
            </label>
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Looking for</span>
              <input
                {...register('lookingFor')}
                placeholder="e.g. ML Engineer, UI Designer"
                className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                aria-invalid={!!errors.lookingFor}
              />
              {fieldError(errors.lookingFor?.message)}
            </label>
            <Button type="submit" disabled={isSubmitting} className="self-start">
              Create team
            </Button>
          </form>
        </Card>

        {/* Invitations */}
        <Card className="flex flex-col gap-md">
          <h2 className="text-base font-semibold text-on-surface">Pending invitations</h2>
          {invitations && invitations.length > 0 ? (
            <ul className="flex flex-col gap-sm">
              {invitations.map((inv) => {
                const state = inviteState[inv.id]
                return (
                  <li key={inv.id} className="flex flex-col gap-xs rounded-lg border border-outline-variant p-sm">
                    <span className="text-sm font-medium text-on-surface">{inv.projectTitle}</span>
                    <span className="text-xs text-on-surface-variant">
                      Invited by {inv.invitedBy} · {inv.role}
                    </span>
                    {state ? (
                      <Badge tone={state === 'accepted' ? 'success' : 'neutral'}>
                        {state === 'accepted' ? 'Accepted' : 'Declined'}
                      </Badge>
                    ) : (
                      <div className="flex gap-xs">
                        <Button size="sm" onClick={() => setInviteState((s) => ({ ...s, [inv.id]: 'accepted' }))}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInviteState((s) => ({ ...s, [inv.id]: 'rejected' }))}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="mail" title="No pending invitations" />
          )}
        </Card>
      </div>
    </div>
  )
}
