/**
 * Dismissible inline banner in the Material-3 palette, for feedback that sits
 * inside a form or drawer and needs its own icon or rich content. Prefer
 * ActionBanner for plain success/error messages coming straight off a hook.
 */
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

const BANNER_TONE = {
  success: 'bg-[#e6f4ea] text-[#1e7a3d]',
  info: 'bg-secondary-container/20 text-secondary',
  error: 'bg-error-container text-on-error-container',
}

export function Banner({
  tone,
  icon,
  onClose,
  className,
  children,
}: {
  tone: keyof typeof BANNER_TONE
  icon: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('flex items-center gap-sm rounded-xl px-md py-sm text-body-md', BANNER_TONE[tone], className)}
      role="status"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="flex items-center opacity-70 hover:opacity-100">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}
