/**
 * Faculty Review Engine — ported from the Stitch "Faculty Review Dashboard":
 * summary tiles, a submission queue, and a detailed evaluation panel with
 * artifacts, feedback, credit awarding and decision actions. Decisions post
 * through useFacultyReview → reviewsService (no business logic in the UI).
 */
import { useState } from 'react'
import type { ReviewDecisionInput, ReviewStats, ReviewSubmission } from '@/types/domain'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useFacultyReview } from '@/hooks/useFacultyReview'
import { SubmissionQueueCard } from '@/features/reviews/SubmissionQueueCard'
import { ArtifactRow } from '@/features/reviews/ArtifactRow'
import { ReviewStatusBadge } from '@/features/reviews/ReviewStatusBadge'

type Decision = ReviewDecisionInput['decision']

export function FacultyReviewView({
  stats,
  submissions,
}: {
  stats: ReviewStats | null
  submissions: ReviewSubmission[]
}) {
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? null)
  const selected = submissions.find((s) => s.id === selectedId) ?? submissions[0] ?? null

  return (
    <div className="mx-auto w-full max-w-container-max px-md py-lg md:px-lg">
      {/* Summary tiles */}
      <section className="mb-lg grid grid-cols-1 gap-md md:grid-cols-3">
        <StatTile label="Pending Reviews" value={stats?.pending ?? 0} bar="bg-secondary" valueClass="text-primary" />
        <StatTile label="Under Review" value={stats?.underReview ?? 0} bar="bg-secondary-container" valueClass="text-secondary" pad2 />
        <StatTile label="Completed" value={stats?.completed ?? 0} bar="bg-outline-variant" valueClass="text-on-surface-variant" />
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        {/* Queue */}
        <section className="flex flex-col gap-sm lg:col-span-4">
          <div className="mb-xs flex items-center justify-between px-2">
            <h2 className="text-headline-sm">Submission Queue</h2>
            <span className="material-symbols-outlined text-outline" aria-hidden="true">sort</span>
          </div>
          <div className="flex flex-col gap-sm">
            {submissions.map((s) => (
              <SubmissionQueueCard
                key={s.id}
                submission={s}
                selected={s.id === selected?.id}
                onSelect={() => setSelectedId(s.id)}
              />
            ))}
          </div>
        </section>

        {/* Detail */}
        <section className="lg:col-span-8">
          {selected && <EvaluationPanel key={selected.id} submission={selected} />}
        </section>
      </div>
    </div>
  )
}

function EvaluationPanel({ submission }: { submission: ReviewSubmission }) {
  const { comment, setComment, credits, setCredits, submitting, decided, error, submit } = useFacultyReview(submission)
  const [decision, setDecision] = useState<Decision | null>(null)
  const shownMembers = submission.members.slice(0, 3)
  const overflow = submission.members.length - shownMembers.length

  return (
    <div className="flex flex-col gap-lg rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-lg">
      {/* Header */}
      <div className="flex flex-col justify-between gap-md border-b border-outline-variant/30 pb-lg md:flex-row md:items-center">
        <div>
          <h2 className="mb-1 text-headline-md text-primary">Detailed Review: {submission.teamName}</h2>
          <p className="text-on-surface-variant">
            Faculty: <span className="font-semibold text-secondary">{submission.facultyName}</span>
          </p>
        </div>
        <div className="flex -space-x-2">
          {shownMembers.map((m) => (
            <Avatar key={m.id} initials={m.avatarInitials} size="sm" className="border-2 border-surface-container-lowest" />
          ))}
          {overflow > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-highest text-[10px] font-bold">
              +{overflow}
            </span>
          )}
        </div>
      </div>

      {/* Artifacts */}
      <div>
        <h3 className="mb-sm flex items-center gap-2 text-headline-sm">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">folder_open</span>
          Submitted Artifacts
        </h3>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          {submission.attachments.map((a, i) => (
            <ArtifactRow key={a.id} attachment={a} canPreview={i === 0} />
          ))}
        </div>
      </div>

      {decided ? (
        <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-lg">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">check_circle</span>
            <p className="text-body-md font-medium">Formal review submitted for {submission.teamName}.</p>
          </div>
          <ReviewStatusBadge status={decided} />
        </div>
      ) : (
        <>
          {/* Evaluation */}
          <div className="flex flex-col gap-xs">
            <label htmlFor="faculty-comment" className="flex items-center gap-2 text-headline-sm">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">rate_review</span>
              Faculty Evaluation
            </label>
            <textarea
              id="faculty-comment"
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide constructive feedback on the methodology and technical implementation…"
              className="w-full resize-none rounded-xl border border-outline-variant/60 bg-surface/30 p-lg outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10"
            />
          </div>

          {/* Credits + actions */}
          <div className="flex flex-col gap-lg sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label htmlFor="credit-input" className="mb-xs flex items-center gap-2 text-headline-sm">
                <span className="material-symbols-outlined text-secondary" aria-hidden="true">military_tech</span>
                Award Academic Credits
              </label>
              <div className="flex items-center gap-sm">
                <input
                  id="credit-input"
                  type="number"
                  min={0}
                  max={submission.creditsMax}
                  step={0.5}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-32 rounded-xl border border-outline-variant/60 p-sm font-mono text-lg focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                />
                <span className="text-on-surface-variant">out of {submission.creditsMax.toFixed(1)} credits available</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-sm">
              <DecisionButton icon="block" label="Reject" active={decision === 'rejected'} tone="error" onClick={() => setDecision('rejected')} />
              <DecisionButton icon="history_edu" label="Request Changes" active={decision === 'changes_requested'} tone="neutral" onClick={() => setDecision('changes_requested')} />
              <DecisionButton icon="check_circle" label="Approve" active={decision === 'approved'} tone="primary" onClick={() => setDecision('approved')} />
            </div>
          </div>

          {error && <p className="text-sm text-error" role="alert">{error}</p>}

          {/* Submit */}
          <div className="flex items-center justify-between border-t border-outline-variant/30 pt-md">
            <span className="hidden items-center gap-sm text-label-md uppercase text-on-surface-variant md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
              Draft autosaved
            </span>
            <Button
              variant="secondary"
              size="lg"
              disabled={!decision || submitting}
              onClick={() => decision && submit(decision)}
              className="w-full md:w-auto"
            >
              {submitting ? 'Submitting…' : 'Submit Formal Review'}
              <span className="material-symbols-outlined" aria-hidden="true">send</span>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  bar,
  valueClass,
  pad2 = false,
}: {
  label: string
  value: number
  bar: string
  valueClass: string
  pad2?: boolean
}) {
  return (
    <div className="flex flex-col gap-xs rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-lg transition-all hover:scale-[1.02]">
      <span className="text-label-md uppercase tracking-wider text-on-surface-variant">{label}</span>
      <div className={`text-display ${valueClass}`}>{pad2 ? String(value).padStart(2, '0') : value}</div>
      <div className={`mt-xs h-1 w-12 rounded-full ${bar}`} />
    </div>
  )
}

function DecisionButton({
  icon,
  label,
  active,
  tone,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  tone: 'error' | 'neutral' | 'primary'
  onClick: () => void
}) {
  const base = 'flex items-center gap-2 rounded-xl border px-md py-sm transition-all active:scale-95'
  const tones = {
    error: active ? 'border-error bg-error/10 text-error' : 'border-error/30 text-error hover:bg-error/5',
    neutral: active
      ? 'border-outline bg-surface-container text-on-surface'
      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
    primary: active ? 'border-primary bg-primary text-on-primary' : 'border-primary/30 text-primary hover:bg-primary/5',
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${base} ${tones[tone]}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
