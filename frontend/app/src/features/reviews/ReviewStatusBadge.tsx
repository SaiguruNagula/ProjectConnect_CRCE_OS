/** Status pill for a review submission — shared by the student and faculty views. */
import { Badge, type BadgeProps } from '@/components/ui/Badge'
import type { ReviewStatus } from '@/types/domain'
import { cn } from '@/utils/cn'

const MAP: Record<ReviewStatus, { label: string; tone: BadgeProps['tone'] }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  under_review: { label: 'Under Review', tone: 'primary' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  changes_requested: { label: 'Changes Requested', tone: 'error' },
}

export function ReviewStatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const { label, tone } = MAP[status]
  return (
    <Badge tone={tone} className={cn('text-[10px] font-bold uppercase tracking-wide', className)}>
      {label}
    </Badge>
  )
}
