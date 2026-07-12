import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/** Base card — border-first, soft, rounded (UI_UX_GUIDELINES §22). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant bg-surface-container-lowest p-md',
        className,
      )}
      {...props}
    />
  )
}
