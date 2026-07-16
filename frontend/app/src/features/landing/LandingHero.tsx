/** Aurora immersive hero. Dark animated-gradient backdrop + primary CTAs. */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function LandingHero() {
  return (
    <section className="aurora-bg relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-md py-xl">
      <div className="relative z-10 mx-auto max-w-container-max text-center">
        <div className="mb-md inline-flex items-center gap-xs rounded-full border border-white/20 bg-white/10 px-sm py-1 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-secondary shadow-[0_0_8px_#4b41e1]" />
          <span className="text-body-md font-medium text-white/80">The Campus Operating System</span>
        </div>
        <h1 className="mb-md font-display text-headline-lg-mobile leading-[1.1] tracking-tight text-white md:text-display">
          Solve Real Problems.
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Build Real Impact.
          </span>
        </h1>
        <p className="mx-auto mb-lg max-w-[600px] text-body-lg text-zinc-300">
          The Campus Operating System for CRCE. Connect students, faculty, and administration
          through real-world innovation and peer-to-peer collaboration.
        </p>
        <div className="mb-xl flex flex-col justify-center gap-md sm:flex-row">
          <Link
            to={ROUTES.PUBLIC.LOGIN}
            className="rounded-lg bg-white px-xl py-md text-body-lg font-bold text-black shadow-xl transition-all hover:bg-zinc-200 active:scale-95"
          >
            Login to Portal
          </Link>
          <Link
            to={ROUTES.SHARED.OPEN_PROBLEMS}
            className="rounded-lg border border-white/20 bg-white/5 px-xl py-md text-body-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Explore Problems
          </Link>
        </div>
      </div>
    </section>
  )
}
