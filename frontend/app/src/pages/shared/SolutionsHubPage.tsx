/**
 * Solutions Hub. A discovery surface for completed / in-review solutions built
 * on the platform. Reads projects via the service and reuses ProjectCard.
 */
import { useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { projectsService } from '@/services/catalog.service'
import type { Project } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

export function SolutionsHubPage() {
  const { data, loading } = useAsync<Project[]>(() => projectsService.list())
  const [query, setQuery] = useState('')

  const solutions = useMemo(
    () =>
      (data ?? []).filter(
        (p) => p.status !== 'active' && p.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  )

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Solutions Hub" subtitle="Explore solutions built and verified across campus." />
      <SearchInput
        placeholder="Search solutions"
        className="md:max-w-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading ? (
        <PageLoader />
      ) : solutions.length === 0 ? (
        <EmptyState icon="apps" title="No solutions yet" description="Completed projects will appear here." />
      ) : (
        <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {solutions.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
