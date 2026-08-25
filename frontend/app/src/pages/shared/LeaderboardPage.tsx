/**
 * Leaderboard. Student/Faculty toggle, live search, top-3 podium, ranking table,
 * and profile navigation. Displays rankings only — the Credit Engine owns the
 * scores (DECISIONS.md §10). Mock data via service; swaps to API unchanged.
 * Layout is a faithful migration of the approved Stitch prototype
 * (crce_os_leaderboard_refined_layout).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { leaderboardService } from '@/services/catalog.service'
import { buildPath, ROUTES } from '@/constants/routes'
import type { LeaderboardEntry } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { SearchInput } from '@/components/ui/SearchInput'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'

type View = 'student' | 'faculty'

export function LeaderboardPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('student')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')

  const { data, loading, error, reload } = useAsync<LeaderboardEntry[]>(
    () => (view === 'student' ? leaderboardService.students() : leaderboardService.faculty()),
    [view],
  )

  const isStudent = view === 'student'
  const contributionLabel = isStudent ? 'Projects' : 'Mentored'
  const entityLabel = isStudent ? 'Entity' : 'Faculty'

  const ranked = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.rank - b.rank),
    [data],
  )
  const departments = useMemo(
    // Members who have not set a department are still ranked; they just do not
    // add a blank option to the filter.
    () => Array.from(new Set(ranked.map((e) => e.department).filter(Boolean))).sort(),
    [ranked],
  )
  // Podium reflects the full ranking; the table below is search- and dept-filtered.
  const podium = ranked.slice(0, 3)
  const rows = useMemo(
    () =>
      ranked.filter(
        (e) =>
          (department === '' || e.department === department) &&
          (e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.department.toLowerCase().includes(query.toLowerCase())),
      ),
    [ranked, query, department],
  )

  // Every ranked member has a public portfolio, keyed by their user id.
  const goToPortfolio = (id: string) => navigate(buildPath(ROUTES.SHARED.PORTFOLIO, { id }))

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Leaderboard" subtitle="Recognizing innovation and contribution across CRCE." />

      {/* Controls: toggle · search · department */}
      <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
        <Tabs
          className="w-full md:w-auto"
          items={[
            { value: 'student', label: 'Student' },
            { value: 'faculty', label: 'Faculty' },
          ]}
          value={view}
          onChange={(v) => setView(v as View)}
        />
        <div className="flex items-center gap-sm md:flex-1 md:justify-end">
          <SearchInput
            placeholder="Search students or faculty..."
            className="w-full md:max-w-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter by department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-10 shrink-0 rounded-lg border border-outline-variant bg-surface px-sm text-label-md text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Couldn’t load the leaderboard"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          {/* Top-3 podium — visual order 2nd · 1st · 3rd */}
          {podium.length === 3 && (
            <div className="grid grid-cols-1 gap-md md:grid-cols-3">
              {[podium[1], podium[0], podium[2]].map((entry) => (
                <PodiumCard key={entry.id} entry={entry} onView={goToPortfolio} />
              ))}
            </div>
          )}

          {/* Ranking table */}
          {rows.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No results"
              description="Try a different search or department."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setDepartment('')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Card className="overflow-hidden p-0 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-outline-variant bg-surface-container-low">
                    <tr>
                      <Th>Rank</Th>
                      <Th>{entityLabel}</Th>
                      <Th>Department</Th>
                      <Th className="text-right">Credits</Th>
                      <Th className="text-right">{contributionLabel}</Th>
                      <Th className="text-center">Badge</Th>
                      <th className="px-lg py-md" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {rows.map((entry) => (
                      <tr key={entry.id} className="group transition-colors hover:bg-surface-container-low">
                        <td className="px-lg py-md font-mono text-body-md text-on-surface-variant">
                          #{entry.rank.toString().padStart(2, '0')}
                        </td>
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-sm">
                            <Avatar initials={entry.avatarInitials} size="md" />
                            <span className="text-body-md font-semibold text-on-surface">{entry.name}</span>
                          </div>
                        </td>
                        <td className="px-lg py-md text-body-md text-on-surface-variant">{entry.department}</td>
                        <td className="px-lg py-md text-right font-mono text-body-md font-bold text-secondary">
                          {entry.credits.toLocaleString()}
                        </td>
                        <td className="px-lg py-md text-right font-mono text-body-md text-on-surface-variant">
                          {entry.contributions}
                        </td>
                        <td className="px-lg py-md text-center">
                          <Badge tone="success" className="whitespace-nowrap">{entry.badge}</Badge>
                        </td>
                        <td className="px-lg py-md text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPortfolio(entry.id)}
                            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Motivational footer */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary-container to-secondary p-lg text-on-secondary-container">
            <div className="relative z-10 flex flex-col items-center justify-between gap-md md:flex-row">
              <div>
                <h3 className="text-headline-sm font-bold">Forge the Future</h3>
                <p className="text-body-md opacity-90">Your innovation journey shapes the future of the CRCE ecosystem.</p>
              </div>
              <Link
                to={ROUTES.SHARED.OPEN_PROBLEMS}
                className="rounded-lg bg-surface-container-lowest px-xl py-sm text-label-md font-bold text-secondary transition-all hover:shadow-lg active:scale-95"
              >
                Start Project
              </Link>
            </div>
            <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          </div>
        </>
      )}
    </div>
  )
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-lg py-md text-label-md font-label-md uppercase tracking-wider text-on-surface-variant',
        className,
      )}
    >
      {children}
    </th>
  )
}

function PodiumCard({
  entry,
  onView,
}: {
  entry: LeaderboardEntry
  onView: (id: string) => void
}) {
  const isWinner = entry.rank === 1
  return (
    <button
      type="button"
      onClick={() => onView(entry.id)}
      className={cn(
        'relative flex flex-col items-center rounded-xl border border-outline-variant bg-surface p-lg text-center transition-all duration-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
        isWinner && 'border-secondary/30 bg-surface-container-lowest ring-1 ring-secondary/10 md:-translate-y-4',
      )}
    >
      <div className="relative mb-md">
        <Avatar
          initials={entry.avatarInitials}
          size="xl"
          className={cn('border-4', isWinner ? 'border-secondary' : 'border-outline-variant')}
        />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-sm py-base text-label-md font-bold text-on-primary">
          #{entry.rank}
        </span>
      </div>
      <h3 className="text-headline-sm font-bold text-on-surface">{entry.name}</h3>
      <p className="mb-md text-label-md font-label-md text-on-surface-variant">{entry.department}</p>
      <div className="mb-sm flex items-center gap-xs">
        <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">verified</span>
        <span className="text-body-md font-bold text-secondary">
          {entry.credits.toLocaleString()} <span className="font-normal text-on-surface-variant">pts</span>
        </span>
      </div>
      <Badge tone="neutral">{entry.badge}</Badge>
    </button>
  )
}
