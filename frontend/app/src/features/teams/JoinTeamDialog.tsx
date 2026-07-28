/**
 * Joining an existing team. Shows what the student is joining — the team, its
 * roster, the open slots and the idea it is pitching — and sends a short message
 * to the team lead, who accepts or rejects it.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Team } from '@/types/domain'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Field, textareaClass } from '@/components/ui/form'

const schema = z.object({
  message: z.string().min(20, 'Tell the team what you bring — at least 20 characters'),
})
type JoinForm = z.infer<typeof schema>

interface JoinTeamDialogProps {
  team: Team | null
  busy: boolean
  onClose: () => void
  onSubmit: (message: string) => Promise<boolean>
}

export function JoinTeamDialog({ team, busy, onClose, onSubmit }: JoinTeamDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<JoinForm>({ resolver: zodResolver(schema), defaultValues: { message: '' } })

  useEffect(() => {
    if (!team) reset({ message: '' })
  }, [team, reset])

  const close = () => {
    if (isDirty && !window.confirm('Discard your request? Your message will be lost.')) return
    onClose()
  }

  const submit = async (values: JoinForm) => {
    const ok = await onSubmit(values.message)
    if (ok) onClose()
  }

  return (
    <Dialog
      open={!!team}
      onClose={close}
      title={team ? `Join ${team.name}` : 'Join a team'}
      description="Your request goes to the team lead, who accepts or rejects it."
    >
      {team && (
        <>
          <div className="mb-md flex flex-col gap-xs rounded-xl bg-surface-container-low p-sm">
            <span className="text-label-md font-semibold text-on-surface">
              {team.openSpots} {team.openSpots === 1 ? 'open slot' : 'open slots'}
              {team.lookingFor.length > 0 && ` · looking for ${team.lookingFor.join(', ')}`}
            </span>
            <p className="text-body-md leading-relaxed text-on-surface-variant">{team.pitch}</p>
            <ul className="flex flex-wrap gap-sm">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-xs">
                  <Avatar initials={m.avatarInitials} size="sm" />
                  <span className="text-label-md text-on-surface-variant">
                    {m.name} · {m.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <form noValidate id="join-form" onSubmit={handleSubmit(submit)}>
            <Field
              label="Message to the team"
              hint="What role would you take, and what have you built before?"
              error={errors.message?.message}
            >
              <textarea {...register('message')} rows={4} className={textareaClass} />
            </Field>
          </form>

          <div className="mt-md flex flex-wrap items-center gap-sm border-t border-outline-variant pt-md">
            <Button type="submit" form="join-form" disabled={busy}>
              {busy ? 'Working…' : 'Request to Join'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}
