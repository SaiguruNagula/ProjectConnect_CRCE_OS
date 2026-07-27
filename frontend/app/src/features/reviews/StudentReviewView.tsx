/**
 * Student Review Engine — read-only. Ported from the Stitch "Review Engine"
 * design: live status hero, progress bento, active phase, faculty feedback,
 * review-history timeline and the locked next step. Students can view status,
 * feedback, history and attachments but cannot approve or reject.
 */
import type { ReviewStatus, ReviewSubmission } from '@/types/domain'
import { Avatar } from '@/components/ui/Avatar'
import { ReviewStatusBadge } from '@/features/reviews/ReviewStatusBadge'
import { ArtifactRow } from '@/features/reviews/ArtifactRow'
import { fmtDate } from '@/utils/date'

const HERO_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending Review',
  under_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="mb-xs ml-1 text-label-md font-bold uppercase tracking-tight text-on-surface-variant">{children}</h3>
  )
}

export function StudentReviewView({ submission }: { submission: ReviewSubmission }) {
  const isLive = submission.status === 'under_review'
  const decisionPending = submission.status === 'under_review' || submission.status === 'pending'
  const approvedCount = submission.history.filter((h) => h.status === 'approved').length
  const pendingCount = decisionPending ? 1 : 0
  const feedback = submission.comments.at(-1)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-sm px-sm py-md">
      {/* Hero status */}
      <div className="relative flex min-h-[160px] flex-col justify-center overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-lg shadow-sm">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />
        <p className="mb-xs text-label-md uppercase tracking-widest text-on-surface-variant/70">Review Status</p>
        <div className="flex items-baseline gap-xs">
          <h2 className="text-headline-lg-mobile text-primary">{HERO_LABEL[submission.status]}</h2>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary-container/20 px-2 py-0.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
              <span className="text-[10px] font-medium text-secondary">LIVE</span>
            </span>
          )}
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {submission.milestoneCode.replace(/_/g, ' ')}: {submission.milestone}
        </p>
      </div>

      {/* Progress bento */}
      <div className="grid grid-cols-3 gap-xs">
        <BentoTile icon="verified" iconClass="text-on-tertiary-fixed-variant" filled value={approvedCount} label="Approved" />
        <BentoTile icon="pending" iconClass="text-secondary-container" value={pendingCount} label="Pending" />
        <BentoTile
          icon="lock"
          iconClass="text-on-surface-variant/40"
          value={submission.creditsAwarded ?? '--'}
          label="Credits"
          muted
        />
      </div>

      {/* Active phase */}
      <section>
        <SectionLabel>Active Phase</SectionLabel>
        <div className="space-y-md rounded-xl border border-l-4 border-outline-variant border-l-primary bg-surface-container-lowest p-lg">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-headline-sm">
                <span className="mr-1 font-mono text-label-md text-on-surface-variant/60">#{submission.milestoneCode}</span>
                {submission.milestone}
              </h4>
              <p className="text-body-md text-on-surface-variant">{submission.milestoneSubtitle}</p>
            </div>
            <span className="material-symbols-outlined text-primary" aria-hidden="true">architecture</span>
          </div>
          <div className="grid grid-cols-2 gap-sm pt-xs">
            <div className="space-y-1">
              <p className="text-label-md text-on-surface-variant/60">Due Date</p>
              <p className="font-mono text-mono font-medium">{fmtDate(submission.dueDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-label-md text-on-surface-variant/60">Faculty</p>
              <p className="text-body-md font-medium">
                {submission.facultyName}{' '}
                <span className="font-mono text-[10px] text-on-surface-variant/60">(ID: {submission.facultyId})</span>
              </p>
            </div>
          </div>
          {submission.attachments.length > 0 && (
            <div className="space-y-xs pt-xs">
              {submission.attachments.map((a) => (
                <ArtifactRow key={a.id} attachment={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Review decision */}
      <section>
        <SectionLabel>Review Decision</SectionLabel>
        {decisionPending ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-xl text-center">
            <span className="material-symbols-outlined mb-sm text-[32px] text-on-surface-variant/40" aria-hidden="true">hourglass_empty</span>
            <p className="text-body-md font-medium text-on-surface-variant">Decision Pending</p>
            <p className="max-w-sm text-label-md text-on-surface-variant/60">
              Faculty is currently reviewing {submission.milestone}. Expected response within 24–48 hours.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">task_alt</span>
              <p className="text-body-md font-medium">Milestone {submission.status === 'approved' ? 'approved' : 'returned for changes'}.</p>
            </div>
            <ReviewStatusBadge status={submission.status} />
          </div>
        )}
      </section>

      {/* Faculty feedback */}
      {feedback && (
        <section>
          <SectionLabel>Faculty Feedback</SectionLabel>
          <div className="rounded-xl border border-outline-variant/10 bg-primary-container p-lg text-on-primary-container shadow-sm">
            <div className="flex items-start gap-sm">
              <Avatar initials={feedback.authorInitials} size="sm" />
              <div className="space-y-xs">
                <p className="text-body-md italic leading-relaxed opacity-90">“{feedback.text}”</p>
                <div className="flex items-center gap-xs text-on-primary-container/60">
                  <span className="font-mono text-[11px]">{fmtTime(feedback.timestamp)}</span>
                  <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                  <span className="text-label-md">{feedback.phase}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Review history */}
      {submission.history.length > 0 && (
        <section>
          <SectionLabel>Review History</SectionLabel>
          <ol className="space-y-0 pl-1">
            {submission.history.map((h, i) => (
              <li key={h.id} className="relative pb-lg pl-8 last:pb-0">
                {i < submission.history.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-full w-0.5 bg-outline-variant/40" aria-hidden="true" />
                )}
                <span className="absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-on-tertiary-fixed-variant">
                  <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check</span>
                </span>
                <div className="flex flex-col gap-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="text-body-md font-bold">{h.title}</h5>
                    <ReviewStatusBadge status={h.status} />
                  </div>
                  <p className="text-[13px] text-on-surface-variant">Submitted: {fmtDate(h.submittedAt)} • {h.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Next step (locked) */}
      {submission.nextStep && (
        <section>
          <div className="flex items-center justify-between rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-sm opacity-60">
            <div className="flex items-center gap-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
                <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">lock</span>
              </span>
              <div>
                <p className="text-label-md text-on-surface-variant">Next Step</p>
                <p className="text-body-md font-bold">{submission.nextStep}</p>
              </div>
            </div>
            <span className="font-mono text-label-md">Locked</span>
          </div>
        </section>
      )}
    </div>
  )
}

function BentoTile({
  icon,
  iconClass,
  value,
  label,
  filled = false,
  muted = false,
}: {
  icon: string
  iconClass: string
  value: number | string
  label: string
  filled?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-sm text-center">
      <span
        className={`material-symbols-outlined mb-1 ${iconClass}`}
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className={`text-headline-sm ${muted ? 'text-on-surface-variant/40' : ''}`}>{value}</p>
      <p className="text-label-md text-on-surface-variant">{label}</p>
    </div>
  )
}
