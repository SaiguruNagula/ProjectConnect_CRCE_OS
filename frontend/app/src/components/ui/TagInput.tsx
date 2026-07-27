import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'

interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Chip colour family (Stitch: primary for skills, tertiary for tools). */
  tone?: 'primary' | 'tertiary'
}

const TONE = {
  primary: 'bg-primary-fixed text-on-primary-fixed-variant',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
}

/**
 * Chip / tag entry field. Enter or comma commits a tag; Backspace on an empty
 * input removes the last one. Duplicates (case-insensitive) are ignored.
 */
export function TagInput({ value, onChange, placeholder, tone = 'primary' }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const tag = draft.trim()
    if (tag && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
      {value.map((tag) => (
        <span key={tag} className={cn('flex items-center gap-1 rounded-full px-xs py-0.5 text-label-md', TONE[tone])}>
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="flex items-center">
            <span className="material-symbols-outlined text-xs" aria-hidden="true">close</span>
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-[8ch] flex-grow border-none bg-transparent p-0 text-body-md text-on-surface outline-none focus:ring-0"
      />
    </div>
  )
}
