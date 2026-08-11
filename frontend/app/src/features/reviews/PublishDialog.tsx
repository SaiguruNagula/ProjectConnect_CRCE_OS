/**
 * After a final approval, faculty choose whether the project becomes public.
 * A confirmation only — publishing makes the project visible in the Solutions
 * Hub, which is not something to trip into with a stray click.
 */
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  teamName: string
  busy: boolean
  onDecide: (publish: boolean) => Promise<boolean>
}

export function PublishDialog({ open, onClose, teamName, busy, onDecide }: PublishDialogProps) {
  const decide = async (publish: boolean) => {
    if (await onDecide(publish)) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish to the Solutions Hub?"
      description={`${teamName}'s approved project can be published for the whole campus, or kept internal.`}
      footer={
        <>
          <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
            Keep Internal
          </Button>
          <Button onClick={() => decide(true)} disabled={busy}>
            {busy ? 'Working…' : 'Publish to Solutions Hub'}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-sm text-body-md text-on-surface-variant">
        <li className="flex items-start gap-sm">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">public</span>
          <span>
            <strong className="text-on-surface">Publish</strong> — the project appears in the Solutions Hub
            with its repository, demo and report, credited to the team.
          </span>
        </li>
        <li className="flex items-start gap-sm">
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">lock</span>
          <span>
            <strong className="text-on-surface">Keep internal</strong> — the approval and credits still stand,
            and the project stays on the team's portfolio only.
          </span>
        </li>
      </ul>
    </Dialog>
  )
}
