/**
 * The lifecycle status pill — the one place a status is turned into words and a
 * colour. Shared by the queue cards, the review panel, the student view and the
 * timeline so no two surfaces can name the same state differently.
 */
import { Badge } from '@/components/ui/Badge'
import type { ReviewLifecycleStatus } from '@/types/domain'
import { cn } from '@/utils/cn'
import { LIFECYCLE_STATUS } from './stages'

export function ReviewStatusBadge({
  status,
  short = false,
  className,
}: {
  status: ReviewLifecycleStatus
  /** Use the compact wording where the full label will not fit. */
  short?: boolean
  className?: string
}) {
  const meta = LIFECYCLE_STATUS[status]
  return (
    <Badge tone={meta.tone} className={cn('text-[10px] font-bold uppercase tracking-wide', className)}>
      {short ? meta.short : meta.label}
    </Badge>
  )
}
