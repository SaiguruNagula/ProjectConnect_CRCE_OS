/**
 * Innovation Hub — the public Problem Marketplace overview
 * (crce_os_innovation_hub_overview_connected). Keeps the approved Stitch layout
 * — hero, search/toggle, quick filters, featured problems, campus solutions,
 * innovation pipeline, suggest CTA and a stats bar — but every rail now reads
 * the same problems, solutions and campus metrics as the rest of the app via
 * useInnovationHub. The top nav and footer come from PublicLayout.
 */
import { Link } from 'react-router-dom'
import { useInnovationHub } from '@/hooks/useInnovationHub'
import { buildPath, QUERY_PARAMS, ROUTES, withQuery } from '@/constants/routes'
import type { Problem, Solution } from '@/types/domain'
import { EmptyState } from '@/components/ui/EmptyState'
import { SolutionStatusBadge } from '@/features/solutions/SolutionStatusBadge'
import { daysLeft } from '@/utils/date'

/** Card accents, cycled by position — presentation only, never data. */
const ACCENTS = [
  { iconWrap: 'bg-secondary-fixed', iconColor: 'text-secondary' },
  { iconWrap: 'bg-on-tertiary-container/10', iconColor: 'text-on-tertiary-container' },
  { iconWrap: 'bg-primary-container', iconColor: 'text-white' },
]

const DIFFICULTY_ICON: Record<Problem['difficulty'], string> = {
  Beginner: 'school',
  Intermediate: 'auto_awesome',
  Advanced: 'bolt',
}

const PIPELINE = [
  { icon: 'search', label: 'Problem', to: ROUTES.SHARED.OPEN_PROBLEMS, accent: 'border-secondary text-secondary' },
  { icon: 'groups', label: 'Team', to: ROUTES.SHARED.TEAM_FORMATION, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'rate_review', label: 'Review', to: ROUTES.SHARED.REVIEW_ENGINE, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'package_2', label: 'Product', to: ROUTES.SHARED.SOLUTIONS, accent: 'border-outline-variant text-on-surface-variant' },
  { icon: 'auto_graph', label: 'Impact', to: ROUTES.SHARED.LEADERBOARD, accent: 'border-primary text-primary' },
]

export function InnovationHubPage() {
  const {
    featuredProblems,
    featuredSolutions,
    departments,
    impact,
    query,
    setQuery,
    department,
    setDepartment,
    clearFilters,
    filtered,
    loading,
    error,
  } = useInnovationHub()

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
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search problems and solutions"
              placeholder="Search by title, faculty, or technology stack..."
              className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-12 pr-4 outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low p-1">
            <Link
              to={withQuery(ROUTES.SHARED.OPEN_PROBLEMS, { [QUERY_PARAMS.SEARCH]: query })}
              className="rounded-md bg-surface-container-lowest px-md py-2 font-label-md text-label-md font-medium text-on-surface shadow-sm transition-all"
            >
              Problems
            </Link>
            <Link
              to={withQuery(ROUTES.SHARED.SOLUTIONS, { [QUERY_PARAMS.SEARCH]: query })}
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
          <FilterChip active={department === ''} onClick={() => setDepartment('')}>
            All Problems
          </FilterChip>
          {departments.map((name) => (
            <FilterChip
              key={name}
              active={department === name}
              onClick={() => setDepartment(department === name ? '' : name)}
            >
              {name}
            </FilterChip>
          ))}
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 px-sm font-label-md text-label-md font-medium text-secondary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Featured high-impact problems */}
      <section className="mb-xl">
        <h2 className="mb-lg font-headline-lg text-headline-lg">Featured High-Impact Problems</h2>
        {loading && <p className="text-body-md text-on-surface-variant">Loading problems…</p>}
        {!loading && featuredProblems.length === 0 && (
          <EmptyState
            icon="search_off"
            title={error ? 'Could not load problems' : 'No problems match your search'}
            description={error ?? 'Try a different keyword or clear the department filter.'}
          />
        )}
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {featuredProblems.map((problem, i) => (
            <FeaturedProblemCard key={problem.id} problem={problem} accent={i} />
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
        {!loading && featuredSolutions.length === 0 && (
          <EmptyState
            icon="apps"
            title="No live solutions match your search"
            description="Solutions appear here once a project ships and faculty approve it."
          />
        )}
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {featuredSolutions.map((solution) => (
            <SolutionTile key={solution.id} solution={solution} />
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
          {impact.map((stat) => (
            <span key={stat.label}>
              {stat.value.toLocaleString()} {stat.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'shrink-0 rounded-full bg-on-surface px-md py-2 font-label-md text-label-md text-on-primary'
          : 'shrink-0 rounded-full bg-surface-container-high px-md py-2 font-label-md text-label-md transition-colors hover:bg-surface-container-highest'
      }
    >
      {children}
    </button>
  )
}

function FeaturedProblemCard({ problem, accent }: { problem: Problem; accent: number }) {
  const style = ACCENTS[accent % ACCENTS.length]
  const days = daysLeft(problem.endDate)
  return (
    <Link
      to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problem.id })}
      className="group relative block overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="absolute right-0 top-0 p-4">
        <span className="rounded bg-secondary-container px-2 py-1 text-[10px] font-bold uppercase text-on-secondary-container">
          {problem.difficulty}
        </span>
      </div>
      <div className={`mb-md flex h-12 w-12 items-center justify-center rounded-lg ${style.iconWrap}`}>
        <span className={`material-symbols-outlined ${style.iconColor}`} aria-hidden="true">
          {DIFFICULTY_ICON[problem.difficulty]}
        </span>
      </div>
      <h3 className="mb-xs font-headline-sm text-headline-sm">{problem.title}</h3>
      <p className="mb-lg text-body-md text-on-surface-variant">{problem.summary}</p>
      <div className="flex items-center justify-between border-t border-outline-variant pt-lg">
        <span className="text-label-md text-on-surface-variant">
          {problem.currentTeamCount}/{problem.teamSize} members · {days > 0 ? `${days}d left` : 'Closing'}
        </span>
        <span className="font-mono text-mono font-bold text-secondary">
          {problem.creditReward} Credits
        </span>
      </div>
    </Link>
  )
}

function SolutionTile({ solution }: { solution: Solution }) {
  return (
    <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-md flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
          <span className="material-symbols-outlined text-green-700" aria-hidden="true">
            {solution.icon}
          </span>
        </div>
        <SolutionStatusBadge status={solution.status} />
      </div>
      <h3 className="mb-xs font-headline-sm text-headline-sm">{solution.name}</h3>
      <p className="mb-lg flex-1 text-body-md text-on-surface-variant">{solution.description}</p>
      <Link
        to={
          solution.problemId
            ? buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: solution.problemId })
            : ROUTES.SHARED.SOLUTIONS
        }
        className="w-full rounded-lg bg-surface-container-low py-2 text-center font-medium text-on-surface transition-colors hover:bg-surface-container"
      >
        {solution.problemId ? 'View the problem it solves' : 'Open Solution'}
      </Link>
    </div>
  )
}
