/**
 * Shared authenticated layout (sidebar + topbar + content). The four role
 * layouts are thin wrappers over this, differing only by role + nav config —
 * so there is one implementation of the workspace shell, not four.
 */
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { NavItem, Role } from '@/types'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Topbar } from '@/components/navigation/Topbar'

interface RoleLayoutProps {
  role: Role
  items: NavItem[]
}

export function RoleLayout({ role, items }: RoleLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={items}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} roleLabel={role} />
        <main className="flex-1 p-md md:p-lg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
