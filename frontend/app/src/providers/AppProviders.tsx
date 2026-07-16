/**
 * Composes all global providers in one place so the app root stays flat.
 * Order: error boundary (outermost) → theme → auth → role.
 */
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { RoleProvider } from '@/providers/RoleProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>{children}</RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
