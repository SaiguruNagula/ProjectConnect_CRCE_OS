import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: readonly string[]
  /** Label for the "all / none" option. */
  allLabel?: string
}

/** Styled native select — accessible by default, no dependency. */
export function Select({ label, options, allLabel, className, ...props }: SelectProps) {
  return (
    <select
      aria-label={label}
      className={cn(
        'h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
        className,
      )}
      {...props}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
