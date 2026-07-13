/**
 * Profile. Reused by /student/profile and /faculty/profile. Reads the signed-in
 * user and, per role, a relevant section (student: skills + portfolio link;
 * faculty: mentorship stats) from existing services. No duplication.
 */
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { portfolioService, dashboardService } from '@/services/catalog.service'
import type { Portfolio, DashboardStats } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { initials } from '@/mocks/users'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'

export function ProfilePage() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'faculty'
  const portfolio = useAsync<Portfolio>(() => portfolioService.get('me'))
  const facultyStats = useAsync<DashboardStats[]>(() => dashboardService.stats('faculty'))

  if (!user) return null

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Profile" subtitle="Your account and platform identity." />

      <Card className="flex flex-col items-center gap-sm text-center sm:flex-row sm:text-left">
        <Avatar initials={initials(user.name)} size="lg" />
        <div className="flex flex-1 flex-col gap-base">
          <h2 className="text-xl font-semibold text-on-surface">{user.name}</h2>
          <p className="text-sm text-on-surface-variant">{user.email}</p>
          <Badge tone="primary" className="w-fit capitalize">{user.role}</Badge>
        </div>
        {!isFaculty && (
          <Link to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' })}>
            <Button variant="outline">View public portfolio</Button>
          </Link>
        )}
      </Card>

      {isFaculty ? (
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {facultyStats.data?.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      ) : (
        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Skills</h2>
          <div className="flex flex-wrap gap-base">
            {portfolio.data?.skills.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
          </div>
        </Card>
      )}
    </div>
  )
}
