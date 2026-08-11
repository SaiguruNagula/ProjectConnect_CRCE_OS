/**
 * One submission waiting on a decision. Keeps the Stitch queue-card language —
 * glass panel, status pill top-right, mono stage code, team line, italic date —
 * and adds the fields the review workflow needs: mentor and attachment count.
 */
import type { ReviewQueueItem } from '@/types/domain'
import { ReviewStatusBadge } from './ReviewStatusBadge'
import { STAGE_REVIEW } from './stages'
import { fmtDate } from '@/utils/date'
import { cn } from '@/utils/cn'

interface ReviewQueueCardProps {
  item: ReviewQueueItem
  selected: boolean
  onSelect: () => void
}

export function ReviewQueueCard({ item, selected, onSelect }: ReviewQueueCardProps) {
  const stage = STAGE_REVIEW[item.stage]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative w-full rounded-2xl border p-md text-left transition-all hover:border-secondary/60 hover:shadow-md',
        selected
          ? 'border-secondary bg-secondary-container/20 shadow-md'
          : 'border-outline-variant/60 bg-surface-container-lowest',
      )}
    >
      <ReviewStatusBadge status={item.status} short className="absolute right-md top-md" />

      <h3 className="mb-1 max-w-[75%] text-body-lg font-bold text-on-surface">{item.problemTitle}</h3>
      <p className="mb-2 font-mono text-mono uppercase text-on-secondary-fixed-variant">{stage.code}</p>

      <p className="flex items-center gap-xs text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          {item.members.length > 1 ? 'groups' : 'person'}
        </span>
        {item.teamName}
        <span aria-hidden="true">·</span>
        {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
      </p>

      <p className="mt-1 flex items-center gap-xs text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">school</span>
        {item.mentorName}
        <span aria-hidden="true">·</span>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">attach_file</span>
        {item.attachments} {item.attachments === 1 ? 'file' : 'files'}
      </p>

      <p className="mt-1 text-label-md italic text-on-surface-variant/70">
        {item.submittedAt ? `Submitted ${fmtDate(item.submittedAt)}` : 'Not yet submitted'}
      </p>
    </button>
  )
}
