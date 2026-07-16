import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const button = cva(
  'inline-flex items-center justify-center gap-xs rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:opacity-90',
        secondary: 'bg-secondary text-on-secondary hover:opacity-90',
        outline: 'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high',
        ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        danger: 'bg-error text-on-error hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-sm text-xs',
        md: 'h-10 px-md text-sm',
        lg: 'h-12 px-lg text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'
