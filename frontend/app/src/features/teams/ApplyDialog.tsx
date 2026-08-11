/**
 * Applying to an open problem — solo or as a team. Both routes ask for the same
 * thing (the idea and how it will be approached); the team route additionally
 * shows the roster being submitted, which comes from the team and is never
 * re-typed here.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ApplicationInput, Team } from '@/types/domain'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Field, inputClass, textareaClass } from '@/components/ui/form'

const schema = z.object({
  ideaSummary: z.string().min(20, 'Summarise your idea in at least 20 characters'),
  approach: z.string().min(20, 'Describe your approach in at least 20 characters'),
  attachmentUrl: z.union([z.literal(''), z.string().url('Enter a valid URL')]).optional(),
})
type ApplyForm = z.infer<typeof schema>

const EMPTY: ApplyForm = { ideaSummary: '', approach: '', attachmentUrl: '' }

interface ApplyDialogProps {
  open: boolean
  /** 'team' submits the student's team; 'solo' submits them alone. */
  mode: 'solo' | 'team'
  problemTitle: string
  team: Team | null
  busy: boolean
  onClose: () => void
  onSubmit: (details: Omit<ApplicationInput, 'teamId'>) => Promise<boolean>
}

export function ApplyDialog({
  open,
  mode,
  problemTitle,
  team,
  busy,
  onClose,
  onSubmit,
}: ApplyDialogProps) {
  const asTeam = mode === 'team'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ApplyForm>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (!open) reset(EMPTY)
  }, [open, reset])

  const close = () => {
    if (isDirty && !window.confirm('Discard this application? Your unsaved changes will be lost.')) return
    onClose()
  }

  const submit = async (values: ApplyForm) => {
    const ok = await onSubmit({
      ideaSummary: values.ideaSummary,
      approach: values.approach,
      attachmentUrl: values.attachmentUrl || undefined,
    })
    if (ok) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={asTeam ? 'Apply as a team' : 'Apply solo'}
      description={`Applying to ${problemTitle}. Faculty review every application before a team starts work.`}
    >
      <form noValidate id="apply-form" className="flex flex-col gap-md" onSubmit={handleSubmit(submit)}>
        {asTeam && team && (
          <div className="flex flex-col gap-xs rounded-xl bg-surface-container-low p-sm">
            <span className="text-label-md font-semibold text-on-surface">Applying as {team.name}</span>
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
        )}

        <Field
          label="Idea Summary"
          hint="In a few sentences, what will you build for this problem?"
          error={errors.ideaSummary?.message}
        >
          <textarea {...register('ideaSummary')} rows={4} className={textareaClass} />
        </Field>

        <Field label="Approach" hint="How will you get there? Name the steps." error={errors.approach?.message}>
          <textarea {...register('approach')} rows={4} className={textareaClass} />
        </Field>

        <Field
          label={asTeam ? 'Proof of Concept' : 'Attachment'}
          optional
          hint="Link to anything that supports your application."
          error={errors.attachmentUrl?.message}
        >
          <input {...register('attachmentUrl')} className={inputClass} placeholder="https://…" />
        </Field>
      </form>

      <div className="mt-md flex flex-wrap items-center gap-sm border-t border-outline-variant pt-md">
        <Button type="submit" form="apply-form" disabled={busy}>
          {busy ? 'Working…' : asTeam ? 'Apply as Team' : 'Apply Solo'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={close}>
          Cancel
        </Button>
      </div>
    </Dialog>
  )
}
