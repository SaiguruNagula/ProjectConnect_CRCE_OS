/**
 * Theme context + hook. v1 is light-only (DECISIONS.md §9). Provider lives in
 * providers/ThemeProvider.tsx.
 */
import { createContext, useContext } from 'react'

export type Theme = 'light'

export interface ThemeContextValue {
  theme: Theme
}

export const ThemeContext = createContext<ThemeContextValue>({ theme: 'light' })

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
