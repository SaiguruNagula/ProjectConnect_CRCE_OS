/**
 * Innovation Hub. A campus feed composed from existing services — latest
 * problems, recent activity, and leaderboard highlights. No new data source.
 */
import { useAsync } from '@/hooks/useAsync'
import { problemsService, dashboardService, leaderboardService } from '@/services/catalog.service'
import type { Problem, Activity, LeaderboardEntry } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { ProblemCard } from '@/features/problems/ProblemCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

export function InnovationHubPage() {
  const problems = useAsync<Problem[]>(() => problemsService.list())
  const activity = useAsync<Activity[]>(() => dashboardService.activity())
  const leaders = useAsync<LeaderboardEntry[]>(() => leaderboardService.students())

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Innovation Hub" subtitle="What’s happening across the campus innovation ecosystem." />

      <div className="grid gap-lg lg:grid-cols-3">
        {/* Feed */}
        <div className="flex flex-col gap-md lg:col-span-2">
          <h2 className="text-base font-semibold text-on-surface">Latest problems</h2>
          {problems.loading ? (
            <PageLoader />
          ) : (
            <div className="grid gap-md sm:grid-cols-2">
              {problems.data?.slice(0, 4).map((p) => <ProblemCard key={p.id} problem={p} />)}
            </div>
          )}
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-lg">
          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Recent activity</h2>
            {activity.data?.slice(0, 5).map((a) => (
              <p key={a.id} className="text-sm text-on-surface-variant">
                <span className="font-medium text-on-surface">{a.actor}</span> {a.action}{' '}
                <span className="font-medium text-on-surface">{a.target}</span>
              </p>
            ))}
          </Card>

          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Top innovators</h2>
            {leaders.data?.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center gap-xs">
                <Avatar initials={l.avatarInitials} size="sm" />
                <span className="flex-1 text-sm text-on-surface">{l.name}</span>
                <span className="text-xs font-medium text-on-surface-variant">{l.credits.toLocaleString()}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
