/** Shared date formatting. One implementation instead of a copy per page. */

const DAY_MS = 86_400_000

/** Whole days until `date` (negative once past). */
export function daysLeft(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS)
}

/** Short calendar date, e.g. "Mar 14". */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Compact "time ago" label, e.g. "just now", "4h ago", "3d ago". */
export function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(iso)
}
