/**
 * Public landing page. Marketing hero + value props + CTAs into the platform.
 * Static presentational content (no domain data), so no service is needed.
 */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const FEATURES = [
  { icon: 'lightbulb', title: 'Discover Problems', body: 'Browse real institutional challenges published by faculty and industry.' },
  { icon: 'groups', title: 'Form Teams', body: 'Assemble interdisciplinary teams and build solutions together.' },
  { icon: 'rate_review', title: 'Get Reviewed', body: 'Structured faculty reviews turn work into verified achievement.' },
  { icon: 'stars', title: 'Earn Credits', body: 'A single Credit Engine recognises every meaningful contribution.' },
  { icon: 'leaderboard', title: 'Climb the Leaderboard', body: 'Merit-based rankings across students, faculty and departments.' },
  { icon: 'badge', title: 'Build a Portfolio', body: 'A verified portfolio assembles itself from your real work.' },
]

const LIFECYCLE = ['Problem', 'Team', 'Project', 'Review', 'Credits', 'Leaderboard', 'Portfolio']

export function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex max-w-container-max flex-col items-center gap-md px-md py-xl text-center">
        <span className="rounded-full border border-outline-variant bg-surface-container-low px-md py-base text-xs font-medium text-on-surface-variant">
          The Campus Operating System
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-on-surface md:text-5xl">
          Where campus ideas become measurable impact.
        </h1>
        <p className="max-w-2xl text-base text-on-surface-variant">
          CRCE OS connects students, faculty and leadership through one continuous
          innovation lifecycle — from real problems to verified portfolios.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-sm">
          <Link to={ROUTES.PUBLIC.LOGIN}>
            <Button size="lg">Get started</Button>
          </Link>
          <Link to={ROUTES.SHARED.OPEN_PROBLEMS}>
            <Button size="lg" variant="outline">
              Browse open problems
            </Button>
          </Link>
        </div>

        {/* Lifecycle strip */}
        <div className="mt-md flex flex-wrap items-center justify-center gap-base text-sm text-on-surface-variant">
          {LIFECYCLE.map((step, i) => (
            <span key={step} className="flex items-center gap-base">
              <span className="rounded-lg bg-surface-container-high px-xs py-base font-medium text-on-surface">
                {step}
              </span>
              {i < LIFECYCLE.length - 1 && (
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto grid max-w-container-max gap-md px-md py-xl sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="flex flex-col gap-xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container/20 text-secondary">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {f.icon}
                </span>
              </span>
              <h3 className="text-base font-semibold text-on-surface">{f.title}</h3>
              <p className="text-sm text-on-surface-variant">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto flex max-w-container-max flex-col items-center gap-sm px-md py-xl text-center">
        <h2 className="text-2xl font-semibold text-on-surface">Ready to start building?</h2>
        <p className="max-w-xl text-sm text-on-surface-variant">
          Join the innovation ecosystem and turn your ideas into recognised impact.
        </p>
        <Link to={ROUTES.PUBLIC.LOGIN}>
          <Button size="lg">Enter CRCE OS</Button>
        </Link>
      </section>
    </div>
  )
}
