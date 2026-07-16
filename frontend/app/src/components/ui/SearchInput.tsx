import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/** Search field with leading icon. Accessible label defaults to "Search". */
export function SearchInput({ className, label = 'Search', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <span
        className="material-symbols-outlined pointer-events-none absolute left-xs top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
        aria-hidden="true"
      >
        search
      </span>
      <input
        type="search"
        aria-label={label}
        className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-[40px] pr-sm text-sm text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        {...props}
      />
    </div>
  )
}
