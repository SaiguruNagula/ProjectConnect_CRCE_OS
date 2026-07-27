/**
 * Avatar initials from a display name. A pure presentation helper — it lives in
 * utils/ so components never reach into mock data for it.
 */
export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
