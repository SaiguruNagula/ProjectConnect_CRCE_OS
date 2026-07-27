import { cn } from '@/utils/cn'

interface AvatarProps {
  initials: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
}

/** Initials avatar (no remote images — stable for the demo). */
export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-secondary-container/25 font-semibold text-secondary',
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  )
}
