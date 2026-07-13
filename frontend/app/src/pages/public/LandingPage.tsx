/**
 * Public landing — the Aurora immersive experience
 * (crce_os_aurora_immersive_landing_1). Composed from reusable section
 * components; Open Problems and Leaderboard are service-driven. The top nav and
 * footer are provided by the shared PublicLayout.
 */
import { LandingHero } from '@/features/landing/LandingHero'
import { AboutPillars } from '@/features/landing/AboutPillars'
import { OpenProblemsPreview } from '@/features/landing/OpenProblemsPreview'
import { CampusImpactStats } from '@/features/landing/CampusImpactStats'
import { LeaderboardHighlights } from '@/features/landing/LeaderboardHighlights'
import { SaasLaunched } from '@/features/landing/SaasLaunched'
import { AccessWorkspace } from '@/features/landing/AccessWorkspace'

export function LandingPage() {
  return (
    <>
      <LandingHero />
      <AboutPillars />
      <OpenProblemsPreview />
      <CampusImpactStats />
      <LeaderboardHighlights />
      <SaasLaunched />
      <AccessWorkspace />
    </>
  )
}
