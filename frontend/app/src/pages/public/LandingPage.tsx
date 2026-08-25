/**
 * Public landing — the Aurora immersive experience
 * (crce_os_aurora_immersive_landing_1). Composed from reusable section
 * components; Open Problems and Leaderboard are service-driven. The top nav and
 * footer are provided by the shared SiteLayout.
 */
import { LandingHero } from '@/features/landing/LandingHero'
import { AboutPillars } from '@/features/landing/AboutPillars'
import { OpenProblemsPreview } from '@/features/landing/OpenProblemsPreview'
import { CampusImpactStats } from '@/features/landing/CampusImpactStats'
import { LeaderboardHighlights } from '@/features/landing/LeaderboardHighlights'
import { SaasLaunched } from '@/features/landing/SaasLaunched'
import { AccessWorkspace } from '@/features/landing/AccessWorkspace'
import { useAuth } from '@/contexts/AuthContext'

export function LandingPage() {
  // Open Problems and the Leaderboard read endpoints that require a token, so
  // to an anonymous visitor they can only ever be an "Authentication required."
  // box on a marketing page. Campus impact is public and always shown.
  const { user } = useAuth()

  return (
    <>
      <LandingHero />
      <AboutPillars />
      {user && <OpenProblemsPreview />}
      <CampusImpactStats />
      {user && <LeaderboardHighlights />}
      <SaasLaunched />
      <AccessWorkspace />
    </>
  )
}
