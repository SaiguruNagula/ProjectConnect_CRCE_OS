import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  className?: string
}

/** Accessible progress bar (0–100). */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-container-high', className)}
    >
      <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}
