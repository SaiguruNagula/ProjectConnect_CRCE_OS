/** Status pill for a campus solution — light (list) or solid (featured) variant. */
import type { SolutionStatus } from '@/types/domain'
import { cn } from '@/utils/cn'

const LABEL: Record<SolutionStatus, string> = {
  live: 'Live',
  testing: 'Testing',
  pilot: 'Pilot',
}

const LIGHT: Record<SolutionStatus, string> = {
  live: 'text-green-600 bg-green-50',
  testing: 'text-orange-600 bg-orange-50',
  pilot: 'text-blue-600 bg-blue-50',
}

const SOLID: Record<SolutionStatus, string> = {
  live: 'bg-green-500 text-white',
  testing: 'bg-orange-500 text-white',
  pilot: 'bg-secondary text-white',
}

export function SolutionStatusBadge({
  status,
  variant = 'light',
  className,
}: {
  status: SolutionStatus
  variant?: 'light' | 'solid'
  className?: string
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded px-xs py-[2px] text-[10px] font-bold uppercase tracking-wider',
        variant === 'solid' ? SOLID[status] : LIGHT[status],
        className,
      )}
    >
      {LABEL[status]}
    </span>
  )
}
