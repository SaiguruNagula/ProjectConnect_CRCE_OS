/**
 * Stage-specific form pieces: the faculty feedback note and the action row that
 * every stage form ends with. The generic field shell, control styling and link
 * editor are shared with the rest of the app and live in components/ui/form.
 */
import type { StageReview } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { fmtDate } from '@/utils/date'
import { EVALUATION_SCORES } from './status'

const FEEDBACK_PARTS: { key: keyof StageReview; label: string }[] = [
  { key: 'strengths', label: 'Strengths' },
  { key: 'weaknesses', label: 'Weaknesses' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'comments', label: 'Comments' },
]

/** Faculty feedback on a stage, shown verbatim and impossible to miss. */
export function FeedbackNote({
  from,
  review,
  at,
}: {
  from: string
  review: StageReview
  at?: string
}) {
  const parts = FEEDBACK_PARTS.filter((p) => String(review[p.key] ?? '').trim())

  return (
    <div className="rounded-xl border-l-4 border-secondary bg-secondary-container/15 p-md" role="note">
      <p className="mb-xs flex items-center gap-xs text-label-md font-semibold uppercase tracking-wide text-secondary">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">rate_review</span>
        Faculty feedback
      </p>
      <dl className="flex flex-col gap-sm">
        {parts.map((part) => (
          <div key={part.key} className="flex flex-col gap-base">
            <dt className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              {part.label}
            </dt>
            <dd className="whitespace-pre-line text-body-md leading-relaxed text-on-surface">
              {String(review[part.key])}
            </dd>
          </div>
        ))}
      </dl>
      {review.evaluation && (
        <ul className="mt-sm flex flex-wrap gap-xs">
          {EVALUATION_SCORES.map((score) => (
            <li
              key={score.key}
              className="rounded-full bg-surface-container-lowest px-sm py-base text-label-sm text-on-surface-variant"
            >
              {score.label} <span className="font-mono font-semibold text-on-surface">
                {review.evaluation?.[score.key]}/10
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-xs text-label-sm text-on-surface-variant">
        {review.reviewedBy ?? from}
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
