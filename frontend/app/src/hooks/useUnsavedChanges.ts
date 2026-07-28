/**
 * Warn before the tab closes or reloads while a form holds unsaved edits. Uses
 * the platform's own beforeunload prompt — the browser owns the wording, so
 * there is nothing to style or translate.
 */
import { useEffect } from 'react'

export function useUnsavedChanges(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
