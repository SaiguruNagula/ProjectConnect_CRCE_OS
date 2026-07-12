/**
 * Role provider — PLACEHOLDER. Defaults to no role until real auth populates it.
 */
import { useMemo, type ReactNode } from 'react'
import { RoleContext, type RoleContextValue } from '@/contexts/RoleContext'
import type { Role } from '@/types'

export function RoleProvider({
  children,
  role = null,
}: {
  children: ReactNode
  role?: Role | null
}) {
  const value = useMemo<RoleContextValue>(() => ({ role }), [role])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
