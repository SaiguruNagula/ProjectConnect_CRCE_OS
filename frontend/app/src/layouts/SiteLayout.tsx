/**
 * The shell for every page outside a role workspace — the public site and the
 * shared pages both hang off it.
 *
 * It follows the session rather than the route: signed out it is the public
 * chrome (navbar + footer), signed in it is the caller's own workspace chrome,
 * the same sidebar and topbar their dashboard has. Signing in and then opening
 * Open Problems used to swap a workspace for a marketing header with a "Log in"
 * button on it, which reads as having been signed out and leaves no way back to
 * the dashboard. One shell, chosen by who is asking, is why that cannot happen.
 */
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/navigation/Navbar'
import { Footer } from '@/components/navigation/Footer'
import { RoleLayout } from '@/layouts/RoleLayout'
import { ROLE_NAV } from '@/constants/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function SiteLayout() {
  const { user } = useAuth()

  if (user) return <RoleLayout role={user.role} items={ROLE_NAV[user.role]} />

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
