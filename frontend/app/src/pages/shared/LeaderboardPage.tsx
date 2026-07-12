/**
 * Leaderboard. Student/Faculty toggle, live search, credit sort, and profile
 * navigation. Displays rankings only — the Credit Engine owns the scores
 * (DECISIONS.md §10). Mock data via service; swaps to API unchanged.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { leaderboardService } from '@/services/catalog.service'
import { buildPath, ROUTES } from '@/constants/routes'
import type { LeaderboardEntry } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { SearchInput } from '@/components/ui/SearchInput'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

type View = 'student' | 'faculty'

export function LeaderboardPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('student')
  const [query, setQuery] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const { data, loading, error, reload } = useAsync<LeaderboardEntry[]>(
    () => (view === 'student' ? leaderboardService.students() : leaderboardService.faculty()),
    [view],
  )

  const rows = useMemo(() => {
    const list = (data ?? []).filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.department.toLowerCase().includes(query.toLowerCase()),
    )
    return [...list].sort((a, b) => (sortDesc ? b.credits - a.credits : a.credits - b.credits))
  }, [data, query, sortDesc])

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Leaderboard" subtitle="Recognition earned through verified contributions." />

      <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
        <Tabs
          items={[
            { value: 'student', label: 'Students' },
            { value: 'faculty', label: 'Faculty' },
          ]}
          value={view}
          onChange={(v) => setView(v as View)}
        />
        <div className="flex items-center gap-sm">
          <SearchInput
            placeholder="Search name or department"
            className="w-full md:w-72"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setSortDesc((s) => !s)}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {sortDesc ? 'arrow_downward' : 'arrow_upward'}
            </span>
            Credits
          </Button>
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
      ) : rows.length === 0 ? (
        <EmptyState icon="search_off" title="No results" description="Try a different search." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-outline-variant">
            {rows.map((entry, index) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => navigate(buildPath(ROUTES.SHARED.PORTFOLIO, { id: entry.id }))}
                  className="flex w-full items-center gap-md px-md py-sm text-left transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <span className="w-8 text-center text-sm font-semibold text-on-surface-variant">
                    {index + 1}
                  </span>
                  <Avatar initials={entry.avatarInitials} />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-on-surface">{entry.name}</span>
                    <span className="text-xs text-on-surface-variant">{entry.department}</span>
                  </span>
                  <span className="flex items-center gap-xs">
                    <RankChange value={entry.rankChange} />
                    <span className="w-20 text-right text-sm font-semibold text-on-surface">
                      {entry.credits.toLocaleString()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function RankChange({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-on-surface-variant">—</span>
  }
  const up = value > 0
  return (
    <span className={`flex items-center text-xs ${up ? 'text-[#1e7a3d]' : 'text-error'}`}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {up ? 'arrow_drop_up' : 'arrow_drop_down'}
      </span>
      {Math.abs(value)}
    </span>
  )
}
