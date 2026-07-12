import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badge = cva(
  'inline-flex items-center gap-base rounded-full px-xs py-base text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-container-high text-on-surface-variant',
        primary: 'bg-secondary-container/20 text-secondary',
        success: 'bg-[#e6f4ea] text-[#1e7a3d]',
        warning: 'bg-[#fdecd8] text-[#9a5b00]',
        error: 'bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />
}
