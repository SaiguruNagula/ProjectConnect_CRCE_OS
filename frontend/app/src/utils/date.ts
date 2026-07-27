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
