/**
 * Innovation Hub — the public Problem Marketplace overview
 * (crce_os_innovation_hub_overview_connected). Presentational, pixel-faithful
 * to the Stitch prototype: hero, search/toggle, quick filters, featured
 * problems, campus solutions, innovation pipeline, suggest CTA and a stats bar.
 * The top nav and footer come from PublicLayout.
 *
 * ponytail: content mirrors the prototype as static data (same pattern as
 * LandingHero/CampusImpactStats). Wire to services once the domain model gains
 * credits/badges/solutions — the Problem type has none of those today.
 */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

const FILTERS = [
  'All Problems',
  'Academic Tech',
  'AI / ML',
  'Library Management',
  'IoT & Infrastructure',
  'Student Welfare',
  'Security',
]

const FEATURED = [
  {
    badge: '🔥 Trending',
    icon: 'fingerprint',
    iconWrap: 'bg-secondary-fixed',
    iconColor: 'text-secondary',
    title: 'Smart Attendance Platform',
    summary:
      'Build a seamless, high-security BLE/NFC attendance system integrated with student IDs.',
    avatars: ['', '', '+5'],
    credits: '500 Credits',
  },
  {
    badge: '⭐ Faculty Pick',
    icon: 'auto_awesome',
    iconWrap: 'bg-on-tertiary-container/10',
    iconColor: 'text-on-tertiary-container',
    title: 'Library AI Assistant',
    summary:
      'An LLM-based agent for deep searching university archives and predicting book availability.',
    avatars: [''],
    credits: '450 Credits',
  },
  {
    badge: '💎 High Impact',
    icon: 'energy_savings_leaf',
    iconWrap: 'bg-primary-container',
    iconColor: 'text-white',
    title: 'Smart Campus Grid',
    summary:
      'IoT dashboard for monitoring and optimizing energy consumption across department blocks.',
    avatars: ['', ''],
    credits: '600 Credits',
  },
]

const SOLUTIONS = [
  { title: 'Smart Attendance', summary: 'Automated NFC-based attendance system deployed in Block A.' },
  {
    title: 'Library AI',
    summary: 'Intelligent book recommendation and search agent for the central library.',
  },
  { title: 'Lab Booking', summary: 'Real-time slot management for computer and electronics laboratories.' },
]

const PIPELINE = [
  { icon: 'search', label: 'Problem', to: ROUTES.SHARED.OPEN_PROBLEMS, accent: 'border-secondary text-secondary' },
  { icon: 'groups', label: 'Team', to: ROUTES.SHARED.TEAM_FORMATION, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'developer_mode', label: 'Project', to: ROUTES.SHARED.PROJECT_SPACE, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'package_2', label: 'Product', to: ROUTES.SHARED.SOLUTIONS, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'auto_graph', label: 'Impact', to: ROUTES.SHARED.LEADERBOARD, accent: 'border-primary text-primary' },
]

const STATS = ['420 Problems', '82 Products', '600 Students', '45 Faculty', '1200 Credits']

export function InnovationHubPage() {
  return (
    <div className="mx-auto max-w-container-max px-lg pb-xl">
      {/* Hero */}
      <section className="flex flex-col items-center py-xl text-center">
        <h1 className="mb-md max-w-3xl font-display text-display">
          Solve Real Campus Problems. <span className="text-secondary">Build Products That Matter.</span>
        </h1>
        <p className="mb-lg max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
          Discover, Collaborate, Build, Deploy, Create Campus Impact. Connect with faculty, form
          cross-departmental teams, and solve technical challenges that improve our university ecosystem.
        </p>
        <div className="flex flex-wrap justify-center gap-md">
          <Link
            to={ROUTES.SHARED.OPEN_PROBLEMS}
            className="flex h-10 items-center gap-xs rounded-lg bg-on-surface px-xl font-medium text-on-primary transition-all hover:opacity-90"
          >
            Explore Problems
          </Link>
          <Link
            to={ROUTES.SHARED.SOLUTIONS}
            className="flex h-10 items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-xl font-medium text-on-surface transition-all hover:bg-surface-container-low"
          >
            View Campus Solutions
          </Link>
        </div>
      </section>

      {/* Search & global toggle */}
      <section className="mb-xl">
        <div className="relative flex flex-col items-stretch gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" aria-hidden="true">
              search
            </span>
            <input
              type="text"
              aria-label="Search problems and solutions"
              placeholder="Search by title, faculty, or technology stack..."
              className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-12 pr-4 outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low p-1">
            <Link
              to={ROUTES.SHARED.OPEN_PROBLEMS}
              className="rounded-md bg-surface-container-lowest px-md py-2 font-label-md text-label-md font-medium text-on-surface shadow-sm transition-all"
            >
              Problems
            </Link>
            <Link
              to={ROUTES.SHARED.SOLUTIONS}
              className="px-md py-2 font-label-md text-label-md font-medium text-on-surface-variant transition-all hover:text-on-surface"
            >
              Campus Solutions
            </Link>
          </div>
        </div>
      </section>

      {/* Quick filters */}
      <section className="mb-lg">
        <div className="no-scrollbar flex items-center gap-sm overflow-x-auto pb-2">
          <span className="mr-xs shrink-0 font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
            Filter by:
          </span>
          {FILTERS.map((filter, i) => (
            <button
              key={filter}
              type="button"
              className={
                i === 0
                  ? 'shrink-0 rounded-full bg-on-surface px-md py-2 font-label-md text-label-md text-on-primary'
                  : 'shrink-0 rounded-full bg-surface-container-high px-md py-2 font-label-md text-label-md transition-colors hover:bg-surface-container-highest'
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Featured high-impact problems */}
      <section className="mb-xl">
        <h2 className="mb-lg font-headline-lg text-headline-lg">Featured High-Impact Problems</h2>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {FEATURED.map((p) => (
            <Link
              key={p.title}
              to={ROUTES.SHARED.OPEN_PROBLEMS}
              className="group relative block overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="absolute right-0 top-0 p-4">
                <span className="rounded bg-secondary-container px-2 py-1 text-[10px] font-bold uppercase text-on-secondary-container">
                  {p.badge}
                </span>
              </div>
              <div className={`mb-md flex h-12 w-12 items-center justify-center rounded-lg ${p.iconWrap}`}>
                <span className={`material-symbols-outlined ${p.iconColor}`} aria-hidden="true">
                  {p.icon}
                </span>
              </div>
              <h3 className="mb-xs font-headline-sm text-headline-sm">{p.title}</h3>
              <p className="mb-lg text-body-md text-on-surface-variant">{p.summary}</p>
              <div className="flex items-center justify-between border-t border-outline-variant pt-lg">
                <div className="flex -space-x-2">
                  {p.avatars.map((label, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-dim text-[10px] font-bold"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <span className="font-mono text-mono font-bold text-secondary">{p.credits}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-md flex justify-end">
          <Link
            to={ROUTES.SHARED.OPEN_PROBLEMS}
            className="flex items-center gap-xs font-medium text-secondary hover:underline"
          >
            View All Problems
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* Campus solutions */}
      <section className="mb-xl">
        <div className="mb-lg flex items-end justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg">Campus Solutions</h2>
            <p className="text-on-surface-variant">
              Real products built by CRCE students and actively used across campus.
            </p>
          </div>
          <Link to={ROUTES.SHARED.SOLUTIONS} className="font-medium text-secondary hover:underline">
            View All Solutions →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <div
              key={s.title}
              className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
            >
              <div className="mb-md flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                  <span className="material-symbols-outlined text-green-700" aria-hidden="true">
                    check_circle
                  </span>
                </div>
                <span className="rounded bg-green-50 px-2 py-1 text-[10px] font-bold uppercase text-green-700">
                  LIVE
                </span>
              </div>
              <h3 className="mb-xs font-headline-sm text-headline-sm">{s.title}</h3>
              <p className="mb-lg flex-1 text-body-md text-on-surface-variant">{s.summary}</p>
              <Link
                to={ROUTES.SHARED.SOLUTIONS}
                className="w-full rounded-lg bg-surface-container-low py-2 text-center font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                Open Solution
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Innovation pipeline */}
      <section className="relative mb-xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low px-lg py-lg">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-secondary via-primary to-secondary" />
        <div className="mb-xl text-center">
          <h2 className="font-headline-sm text-headline-sm uppercase tracking-widest text-on-surface-variant opacity-80">
            Innovation Pipeline
          </h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Every campus innovation starts with an idea.
          </p>
        </div>
        <div className="relative flex flex-col items-center justify-between gap-lg md:flex-row">
          <div className="absolute left-0 top-1/2 -z-10 hidden h-[1px] w-full -translate-y-1/2 bg-outline-variant md:block" />
          {PIPELINE.map((node) => (
            <Link key={node.label} to={node.to} className="flex flex-col items-center gap-xs">
              <div
                className={`z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-surface-container-lowest shadow-sm ${node.accent}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {node.icon}
                </span>
              </div>
              <span className="font-label-md text-label-md font-bold">{node.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Suggest a problem CTA */}
      <section className="mt-xl flex justify-center">
        <div className="flex w-full max-w-4xl flex-col items-center gap-lg rounded-2xl border border-outline-variant bg-primary-container p-lg text-on-primary md:flex-row">
          <div className="flex-1">
            <h3 className="mb-xs font-headline-sm text-headline-sm text-white">Have an idea?</h3>
            <p className="mb-xs text-body-md text-on-primary-container">
              Many campus innovations begin with students identifying everyday challenges.
            </p>
            <p className="text-[12px] italic text-on-primary-container opacity-80">
              Suggestions are reviewed by faculty before becoming official campus challenges.
            </p>
          </div>
          <Link
            to={ROUTES.SHARED.OPEN_PROBLEMS}
            className="flex h-12 shrink-0 items-center gap-xs rounded-lg bg-white px-xl font-bold text-primary-container transition-colors hover:bg-surface-bright"
          >
            Suggest a Problem
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="mt-xl border-t border-outline-variant py-md">
        <div className="flex flex-wrap justify-center gap-xl font-label-md text-label-md font-bold uppercase tracking-widest text-on-surface-variant">
          {STATS.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
