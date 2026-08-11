/**
 * Mentor review of student-suggested problems. A suggestion nominates a mentor;
 * only that mentor's approval publishes it to Open Problems. Approve, request
 * changes or reject — every decision carries feedback back to the student.
 */
import { useState } from 'react'
import type { ProblemSuggestion, SuggestionDecisionInput } from '@/types/domain'
import { useProblemSuggestions } from '@/hooks/useProblemSuggestions'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { textareaClass } from '@/components/ui/form'
import { relativeTime } from '@/utils/date'
import { SUGGESTION_STATUS } from './suggestionStatus'

type Decision = SuggestionDecisionInput['decision']

/** @param onPublished Refreshes the caller's problem list after a publish. */
export function MentorSuggestionReview({ onPublished }: { onPublished?: () => void }) {
  const {
    suggestions,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError,
    dismissMessage,
    decide,
  } = useProblemSuggestions(onPublished)

  const pending = suggestions.filter((s) => s.status === 'pending_mentor_review')

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm font-semibold text-on-surface">Suggested Problems</h2>
        {pending.length > 0 && <Badge tone="warning">{pending.length} awaiting you</Badge>}
      </div>

      <ActionBanner tone="success" message={actionMessage} onDismiss={dismissMessage} />
      <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <Card>
          <EmptyState icon="error" title="Couldn’t load suggestions" description={error} />
        </Card>
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState
            icon="task_alt"
            title="No suggestions awaiting review"
            description="Students can suggest problems from the Open Problems page. Approved suggestions are published automatically."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-md">
          {pending.map((suggestion) => (
            <SuggestionReviewCard
              key={suggestion.id}
              suggestion={suggestion}
              busy={busy}
              onDecide={decide}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface SuggestionReviewCardProps {
  suggestion: ProblemSuggestion
  busy: boolean
  onDecide: (input: SuggestionDecisionInput) => Promise<boolean>
}

function SuggestionReviewCard({ suggestion, busy, onDecide }: SuggestionReviewCardProps) {
  const [feedback, setFeedback] = useState('')
  const [touched, setTouched] = useState(false)
  const meta = SUGGESTION_STATUS[suggestion.status]
  const { input } = suggestion

  // Approving needs no note; handing a suggestion back always does.
  const needsFeedback = (decision: Decision) => decision !== 'approved'

  const submit = async (decision: Decision) => {
    if (needsFeedback(decision) && feedback.trim().length < 10) {
      setTouched(true)
      return
    }
    if (decision === 'rejected' && !window.confirm('Reject this suggestion? The student cannot resubmit it.')) {
      return
    }
    const ok = await onDecide({ suggestionId: suggestion.id, decision, feedback: feedback.trim() })
    if (ok) {
      setFeedback('')
      setTouched(false)
    }
  }

  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-start justify-between gap-xs">
        <div className="min-w-0">
          <h3 className="text-body-lg font-bold text-on-surface">{input.title}</h3>
          <p className="text-xs text-on-surface-variant">
            {input.category} · suggested by {suggestion.submittedBy} · {relativeTime(suggestion.submittedAt)}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <Detail label="Problem">{input.description}</Detail>
      <Detail label="Why it matters">{input.importance}</Detail>
      <Detail label="Expected impact">{input.expectedImpact}</Detail>

      {input.referenceLinks.length > 0 && (
        <div className="flex flex-col gap-base">
          <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            References
          </span>
          <ul className="flex flex-col gap-base">
            {input.referenceLinks.map((href) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-label-md font-medium text-secondary hover:underline"
                >
                  {href}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-xs">
        <span className="text-label-md font-semibold text-on-surface">Feedback to the student</span>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className={textareaClass}
          placeholder="Required when requesting changes or rejecting."
        />
        {touched && feedback.trim().length < 10 && (
          <span className="text-label-sm text-error" role="alert">
            Add at least 10 characters of feedback before handing this back.
          </span>
        )}
      </label>

      <div className="flex flex-wrap gap-sm border-t border-outline-variant pt-sm">
        <Button disabled={busy} onClick={() => submit('approved')}>
          Approve &amp; Publish
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => submit('changes_requested')}>
          Request Changes
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => submit('rejected')}>
          Reject
        </Button>
      </div>
    </Card>
  )
}

function Detail({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-base">
      <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
      <p className="text-body-md leading-relaxed text-on-surface">{children}</p>
    </div>
  )
}
