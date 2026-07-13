/**
 * Open Problems catalog. Search + department/difficulty filters over
 * service-provided data. Filter options derive from the data (not hardcoded).
 */
import { useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { problemsService } from '@/services/catalog.service'
import type { Problem } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { ProblemCard } from '@/features/problems/ProblemCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const

export function OpenProblemsPage() {
  const { data, loading, error, reload } = useAsync<Problem[]>(() => problemsService.list())
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [difficulty, setDifficulty] = useState('')

  const departments = useMemo(
    () => Array.from(new Set((data ?? []).map((p) => p.department))).sort(),
    [data],
  )

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          (p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.summary.toLowerCase().includes(query.toLowerCase())) &&
          (department === '' || p.department === department) &&
          (difficulty === '' || p.difficulty === difficulty),
      ),
    [data, query, department, difficulty],
  )

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Open Problems" subtitle="Real institutional challenges waiting for a team." />

      <div className="flex flex-col gap-sm md:flex-row md:items-center">
        <SearchInput
          placeholder="Search problems"
          className="md:max-w-sm md:flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select label="Department" allLabel="All departments" options={departments} value={department} onChange={(e) => setDepartment(e.target.value)} />
        <Select label="Difficulty" allLabel="All levels" options={DIFFICULTIES} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState icon="error" title="Couldn’t load problems" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search_off" title="No problems match your filters" description="Try clearing a filter or searching differently." />
      ) : (
        <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  )
}
