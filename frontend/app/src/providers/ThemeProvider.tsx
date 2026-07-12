/**
 * Theme provider. Pins the `light` class on <html> (v1 is light-only,
 * DECISIONS.md §9 / UI_UX_GUIDELINES §31) and provides a stable seam for future
 * dark mode. Hook lives in contexts/ThemeContext.ts.
 */
import { useEffect, type ReactNode } from 'react'
import { ThemeContext } from '@/contexts/ThemeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}
