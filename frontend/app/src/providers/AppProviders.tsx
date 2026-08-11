/**
 * Composes all global providers in one place so the app root stays flat.
 * Order: error boundary (outermost) → auth → role.
 *
 * ponytail: no ThemeProvider — v1 is light-only (DECISIONS.md §9) and
 * index.html already pins `class="light"` on <html>. Add a provider when a
 * second theme exists, not before.
 */
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { AuthProvider } from '@/providers/AuthProvider'
import { RoleProvider } from '@/providers/RoleProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RoleProvider>{children}</RoleProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
