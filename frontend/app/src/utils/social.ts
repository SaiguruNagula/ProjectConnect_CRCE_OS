/**
 * Profile socials are stored as handles ("aarav-sharma"), not URLs — these build
 * the outbound link so no page hardcodes a provider domain. A value that is
 * already a URL is passed through unchanged.
 */
function toUrl(base: string, handle: string): string {
  const value = handle.trim().replace(/^@/, '')
  return /^https?:\/\//i.test(value) ? value : `${base}${value}`
}

export const githubUrl = (handle: string) => toUrl('https://github.com/', handle)
export const linkedinUrl = (handle: string) => toUrl('https://www.linkedin.com/in/', handle)
