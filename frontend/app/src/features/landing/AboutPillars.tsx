/**
 * About Pillars — the continuous "About" portion of the landing experience.
 * Composes How-It-Works + Why-CRCE-OS so the same section serves both the
 * Landing (/) and the About (/about) routes without duplication.
 */
import { HowItWorks } from '@/features/landing/HowItWorks'
import { WhyCrceOs } from '@/features/landing/WhyCrceOs'

export function AboutPillars() {
  return (
    <section className="mx-auto max-w-container-max px-md py-xl">
      <div className="space-y-xl">
        <HowItWorks />
        <WhyCrceOs />
      </div>
    </section>
  )
}
