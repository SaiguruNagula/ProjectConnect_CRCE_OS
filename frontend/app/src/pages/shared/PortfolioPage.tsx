/**
 * Portfolio. Auto-generated from verified platform activity (DECISIONS.md §10) —
 * here served via the service. Reuses ProjectCard for the projects section.
 */
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { portfolioService } from '@/services/catalog.service'
import type { Portfolio } from '@/types/domain'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-sm">
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      {children}
    </Card>
  )
}

export function PortfolioPage() {
  const { id = 'me' } = useParams()
  const { data, loading, error } = useAsync<Portfolio>(() => portfolioService.get(id), [id])

  if (loading) return <PageLoader />
  if (error || !data) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="badge" title="Portfolio unavailable" description={error ?? undefined} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      {/* Header */}
      <Card className="flex flex-col items-center gap-sm text-center sm:flex-row sm:text-left">
        <Avatar initials={data.avatarInitials} size="lg" />
        <div className="flex flex-1 flex-col gap-base">
          <h1 className="text-2xl font-semibold text-on-surface">{data.name}</h1>
          <p className="text-sm text-on-surface-variant">{data.headline}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold text-secondary">{data.totalCredits.toLocaleString()}</span>
          <span className="text-xs text-on-surface-variant">verified credits</span>
        </div>
      </Card>

      <div className="grid gap-lg lg:grid-cols-3">
        <div className="flex flex-col gap-lg lg:col-span-2">
          <div className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Projects</h2>
            <div className="grid gap-md sm:grid-cols-2">
              {data.projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          </div>

          <Section title="Timeline">
            <ol className="flex flex-col gap-sm">
              {data.timeline.map((t) => (
                <li key={t.id} className="flex gap-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-on-surface">{t.title}</span>
                    <span className="text-xs text-on-surface-variant">{t.date} · {t.description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="flex flex-col gap-lg">
          <Section title="Skills">
            <div className="flex flex-wrap gap-base">
              {data.skills.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
            </div>
          </Section>

          <Section title="Achievements">
            <ul className="flex flex-col gap-base text-sm text-on-surface-variant">
              {data.achievements.map((a) => (
                <li key={a} className="flex items-start gap-base">
                  <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">emoji_events</span>
                  {a}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Research">
            {data.research.map((r) => (
              <p key={r.id} className="text-sm text-on-surface">
                {r.title} <span className="text-on-surface-variant">— {r.venue}, {r.year}</span>
              </p>
            ))}
          </Section>

          <Section title="Certificates">
            {data.certificates.map((c) => (
              <p key={c.id} className="text-sm text-on-surface">
                {c.title} <span className="text-on-surface-variant">— {c.issuer}, {c.date}</span>
              </p>
            ))}
          </Section>
        </div>
      </div>
    </div>
  )
}
