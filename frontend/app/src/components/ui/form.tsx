/**
 * Form primitives shared by every module that collects a submission — the field
 * shell, the control styling and the link-list editor. One implementation so a
 * label, a hint and an error read identically wherever a form appears.
 */
import { useEffect, useState, type ReactNode } from 'react'

export const inputClass =
  'h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60'

export const textareaClass =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-sm py-sm text-body-md leading-relaxed text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60'

interface FieldProps {
  label: string
  /** Guidance shown under the label — what a good answer looks like. */
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
}

export function Field({ label, hint, error, optional, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="flex flex-wrap items-baseline gap-xs">
        <span className="text-label-md font-semibold text-on-surface">{label}</span>
        {optional && <span className="text-label-sm text-on-surface-variant">Optional</span>}
      </span>
      {hint && <span className="-mt-1 text-label-sm text-on-surface-variant">{hint}</span>}
      {children}
      {error && (
        <span className="text-label-sm text-error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

const parseLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

interface LinkLinesProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

/**
 * A list of links or file URLs, one per line. A plain textarea beats a custom
 * add/remove widget here: it is keyboard-native, pasteable and needs no per-row
 * controls.
 */
export function LinkLines({ value, onChange, placeholder, rows = 3, disabled }: LinkLinesProps) {
  const [text, setText] = useState(() => value.join('\n'))

  // Re-seed only when the form is reset to a genuinely different set of links,
  // never mid-edit — a trailing blank line has to survive being typed.
  useEffect(() => {
    setText((current) => (parseLines(current).join('\n') === value.join('\n') ? current : value.join('\n')))
  }, [value])

  return (
    <textarea
      rows={rows}
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      className={textareaClass}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseLines(e.target.value))
      }}
    />
  )
}
