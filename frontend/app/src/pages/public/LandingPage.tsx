/**
 * Public landing — the Aurora immersive experience
 * (crce_os_aurora_immersive_landing_1). Composed from reusable section
 * components; Open Problems and Leaderboard are service-driven. The top nav and
 * footer are provided by the shared SiteLayout.
 */
import { Navigate } from 'react-router-dom'
import { LandingHero } from '@/features/landing/LandingHero'
import { AboutPillars } from '@/features/landing/AboutPillars'
import { CampusImpactStats } from '@/features/landing/CampusImpactStats'
import { SaasLaunched } from '@/features/landing/SaasLaunched'
import { AccessWorkspace } from '@/features/landing/AccessWorkspace'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HOME } from '@/constants/navigation'

export function LandingPage() {
  const { user } = useAuth()

  // The marketing hero and its "Login to Portal" CTA are not a place a signed-in
  // user should land — same reasoning as LoginPage. This also means the
  // authenticated-only preview sections below never had an anonymous audience
  // to hide from, so they're gone rather than dead `{user && ...}` branches.
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />

  return (
    <>
      <LandingHero />
      <AboutPillars />
      <CampusImpactStats />
      <SaasLaunched />
      <AccessWorkspace />
    </>
  )
}
