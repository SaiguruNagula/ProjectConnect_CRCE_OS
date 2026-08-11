import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  className?: string
  /** Override the fill colour (defaults to bg-secondary), e.g. for at-risk bars. */
  indicatorClassName?: string
}

/** Accessible progress bar (0–100). */
export function ProgressBar({ value, className, indicatorClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-container-high', className)}
    >
      <div
        className={cn('h-full rounded-full bg-secondary transition-all', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
