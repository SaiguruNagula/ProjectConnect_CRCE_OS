/**
 * Public About — the continuous "About" portion of the aurora experience.
 * Reuses the same section components as the Landing page (no duplication):
 * the pillars, campus impact, and success stories.
 */
import { AboutPillars } from '@/features/landing/AboutPillars'
import { CampusImpactStats } from '@/features/landing/CampusImpactStats'
import { SaasLaunched } from '@/features/landing/SaasLaunched'

export function AboutPage() {
  return (
    <>
      <h1 className="sr-only">About CRCE OS</h1>
      <AboutPillars />
      <CampusImpactStats />
      <SaasLaunched />
    </>
  )
}
