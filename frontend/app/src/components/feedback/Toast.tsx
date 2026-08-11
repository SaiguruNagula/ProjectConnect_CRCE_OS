/**
 * Transient success/error toast for actions whose result is not visible where
 * the user is looking — a review decision changes a queue behind a panel. It
 * reuses ActionBanner for the visuals, so a toast and an inline banner are the
 * same object in two places; only the positioning and auto-dismiss live here.
 */
import { useEffect } from 'react'
import { ActionBanner } from './ActionBanner'

const DISMISS_AFTER_MS = 5000

interface ToastProps {
  tone: 'success' | 'error'
  /** Renders nothing when null — callers pass hook state straight through. */
  message: string | null
  onDismiss: () => void
}

export function Toast({ tone, message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, DISMISS_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed inset-x-md bottom-lg z-50 flex justify-center md:inset-x-auto md:right-lg">
      <div className="pointer-events-auto w-full max-w-md rounded-lg bg-surface-container-lowest shadow-lg">
        <ActionBanner tone={tone} message={message} onDismiss={onDismiss} />
      </div>
    </div>
  )
}
