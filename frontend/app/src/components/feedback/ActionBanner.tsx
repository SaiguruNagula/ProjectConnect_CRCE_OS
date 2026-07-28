/**
 * Dismissible success/error banner for mutation feedback. One implementation so
 * every module reports the outcome of an action the same way.
 */
type Tone = 'success' | 'error'

const TONE: Record<Tone, { icon: string; className: string; hover: string; role: 'status' | 'alert' }> = {
  success: {
    icon: 'check_circle',
    className: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700',
    hover: 'hover:bg-emerald-500/10',
    role: 'status',
  },
  error: {
    icon: 'error',
    className: 'border-red-500/20 bg-red-500/5 text-red-600',
    hover: 'hover:bg-red-500/10',
    role: 'alert',
  },
}

interface ActionBannerProps {
  tone: Tone
  /** Renders nothing when null — callers can pass hook state straight through. */
  message: string | null
  onDismiss: () => void
}

export function ActionBanner({ tone, message, onDismiss }: ActionBannerProps) {
  if (!message) return null
  const style = TONE[tone]
  return (
    <div
      role={style.role}
      className={`flex items-center justify-between gap-md rounded-lg border px-sm py-xs text-xs font-medium ${style.className}`}
    >
      <span className="flex items-center gap-xs">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          {style.icon}
        </span>
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={`rounded p-0.5 ${style.hover}`}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  )
}
