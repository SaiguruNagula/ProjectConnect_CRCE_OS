/**
 * Confirmation for a review decision. Every decision is visible to the team the
 * moment it lands and a rejection cannot be walked back, so each one is
 * confirmed — with the consequence spelled out, not just the verb repeated.
 */
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { DecisionMeta } from './stages'

interface ReviewDecisionDialogProps {
  /** The pending decision; null keeps the dialog closed. */
  decision: DecisionMeta | null
  stageLabel: string
  teamName: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ReviewDecisionDialog({
  decision,
  stageLabel,
  teamName,
  busy,
  onCancel,
  onConfirm,
}: ReviewDecisionDialogProps) {
  return (
    <Dialog
      open={decision !== null}
      onClose={onCancel}
      title={decision ? `${decision.label}?` : ''}
      description={`${stageLabel} — ${teamName}`}
    >
      <p className="text-body-md leading-relaxed text-on-surface-variant">{decision?.confirm}</p>
      <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">
        Your feedback is sent to the team with this decision.
      </p>
      <div className="mt-md flex flex-wrap justify-end gap-sm">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={decision?.tone === 'error' ? 'danger' : 'primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Submitting…' : `Confirm — ${decision?.label ?? ''}`}
        </Button>
      </div>
    </Dialog>
  )
}
