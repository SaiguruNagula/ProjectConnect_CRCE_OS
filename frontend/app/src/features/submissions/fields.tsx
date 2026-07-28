/**
 * Stage-specific form pieces: the faculty feedback note and the action row that
 * every stage form ends with. The generic field shell, control styling and link
 * editor are shared with the rest of the app and live in components/ui/form.
 */
import { Button } from '@/components/ui/Button'
import { fmtDate } from '@/utils/date'

/** Faculty feedback on a stage, shown verbatim and impossible to miss. */
export function FeedbackNote({ from, feedback, at }: { from: string; feedback: string; at?: string }) {
  return (
    <div className="rounded-xl border-l-4 border-secondary bg-secondary-container/15 p-md" role="note">
      <p className="mb-xs flex items-center gap-xs text-label-md font-semibold uppercase tracking-wide text-secondary">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">rate_review</span>
        Faculty feedback
      </p>
      <p className="text-body-md leading-relaxed text-on-surface">{feedback}</p>
      <p className="mt-xs text-label-sm text-on-surface-variant">
        {from}
        {at ? ` · ${fmtDate(at)}` : ''}
      </p>
    </div>
  )
}

interface StageActionsProps {
  /** Wording for the submit button, e.g. 'Submit Idea'. */
  submitLabel: string
  busy: boolean
  dirty: boolean
  /** Discard edits back to the last saved state; confirmed before it runs. */
  onReset: () => void
  onSaveDraft: () => void
  onCancel?: () => void
}

export function StageActions({
  submitLabel,
  busy,
  dirty,
  onReset,
  onSaveDraft,
  onCancel,
}: StageActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-sm border-t border-outline-variant pt-md">
      <Button type="submit" disabled={busy}>
        {busy ? 'Working…' : submitLabel}
      </Button>
      <Button type="button" variant="outline" disabled={busy} onClick={onSaveDraft}>
        Save Draft
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={busy || !dirty}
        onClick={() => {
          // Discarding edits cannot be undone — always ask first.
          if (window.confirm('Discard your unsaved changes on this stage?')) onReset()
        }}
      >
        Reset
      </Button>
      {onCancel && (
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      )}
      {dirty && (
        <span className="ml-auto text-label-sm text-on-surface-variant" role="status">
          Unsaved changes
        </span>
      )}
    </div>
  )
}
