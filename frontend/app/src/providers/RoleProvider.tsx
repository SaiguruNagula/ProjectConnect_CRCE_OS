/**
 * Role provider. Derives the active role from the authenticated demo user so
 * role-aware chrome (layouts, navigation) stays in sync with login/logout.
 */
import { useMemo, type ReactNode } from 'react'
import { RoleContext, type RoleContextValue } from '@/contexts/RoleContext'
import { useAuth } from '@/contexts/AuthContext'

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const value = useMemo<RoleContextValue>(() => ({ role: user?.role ?? null }), [user])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
