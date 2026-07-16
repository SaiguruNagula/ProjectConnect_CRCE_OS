/** A submission in the faculty review queue. Selectable; highlights when active. */
import type { ReviewSubmission } from '@/types/domain'
import { ReviewStatusBadge } from '@/features/reviews/ReviewStatusBadge'
import { cn } from '@/utils/cn'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SubmissionQueueCard({
  submission,
  selected,
  onSelect,
}: {
  submission: ReviewSubmission
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-surface-container-lowest p-sm text-left transition-all',
        selected
          ? 'border-2 border-secondary shadow-md ring-4 ring-secondary/5'
          : cn('border-outline-variant/40 hover:border-secondary/40', submission.status === 'changes_requested' && 'opacity-70'),
      )}
    >
      <div className="absolute right-0 top-0 p-xs">
        <ReviewStatusBadge status={submission.status} />
      </div>
      <p className="mb-1 pr-24 text-[16px] font-semibold text-primary">{submission.projectTitle}</p>
      <p className="mb-2 font-mono text-mono text-on-secondary-fixed-variant">{submission.milestoneCode}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-body-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">groups</span>
          {submission.teamName}
        </span>
        <span className="text-[12px] italic text-outline">{fmtDate(submission.submittedAt)}</span>
      </div>
    </button>
  )
}
