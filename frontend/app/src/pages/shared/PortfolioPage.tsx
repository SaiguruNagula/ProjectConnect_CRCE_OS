/**
 * Portfolio — pixel-ported from the Stitch "Public Portfolio". Auto-generated
 * from verified platform activity (DECISIONS.md §10) and served via
 * portfolioService: profile hero, faculty validations, hall of fame, key
 * metrics, verified skills, live solutions, research, hackathons, timeline and
 * a hire CTA. The page only displays service data — no business logic here.
 */
import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { portfolioService } from '@/services/catalog.service'
import type { Portfolio } from '@/types/domain'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const HALL_ICON: Record<string, string> = {
  'Innovation Champion': 'military_tech',
  'Top Researcher': 'psychology',
  'Hackathon Hero': 'star',
}

function fmtMonth(iso: string): string {
  const d = new Date(`${iso}-01`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
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

  const firstName = data.name.split(' ')[0]

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-md px-md py-lg md:px-lg">
      {/* Hero bento */}
      <section className="grid grid-cols-1 gap-md lg:grid-cols-3">
        {/* Profile */}
        <Card className="flex flex-col items-center gap-md text-center md:flex-row md:items-start md:text-left lg:col-span-2">
          <Avatar initials={data.avatarInitials} className="h-32 w-32 rounded-xl text-3xl md:h-40 md:w-40" />
          <div className="flex-grow space-y-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-display">{data.name}</h1>
              <p className="text-headline-sm text-secondary">{data.tagline}</p>
            </div>
            <p className="max-w-xl text-body-md text-on-surface-variant">{data.bio}</p>
            <div className="flex flex-wrap justify-center gap-sm md:justify-start">
              <a href="#" className="flex items-center gap-xs rounded-lg bg-surface-container px-3 py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">code</span> GitHub
              </a>
              <a href="#" className="flex items-center gap-xs rounded-lg bg-secondary-container/40 px-3 py-2 font-label-md text-on-surface transition-colors hover:bg-secondary-container/60">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">share</span> LinkedIn
              </a>
              <a href="#" className="flex items-center gap-xs rounded-lg bg-secondary px-4 py-2 font-label-md text-on-secondary transition-opacity hover:opacity-90">
                Connect on LinkedIn
              </a>
            </div>
          </div>
        </Card>

        {/* Validations + hall of fame */}
        <div className="flex flex-col gap-md">
          <Card>
            <div className="mb-sm flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">verified</span>
              <h3 className="text-headline-sm">Faculty Validations</h3>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person</span>
                  </span>
                ))}
                {data.facultyValidationCount > 3 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-[10px] font-bold">
                    +{data.facultyValidationCount - 3}
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant">
                Verified by {data.facultyValidationCount} Faculty Mentors for exceptional contributions to campus infrastructure.
              </p>
            </div>
          </Card>

          <Card className="flex-grow">
            <h3 className="mb-sm text-label-md uppercase tracking-widest text-outline">Hall of Fame</h3>
            <div className="flex flex-wrap gap-xs">
              {data.hallOfFame.map((b) => (
                <span key={b} className="flex items-center gap-xs rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1 font-label-md text-secondary">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{HALL_ICON[b] ?? 'workspace_premium'}</span>
                  {b}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid grid-cols-2 gap-sm md:grid-cols-4">
        <Metric label="Total Credits" value={data.totalCredits.toLocaleString()} />
        <Metric label="Global Rank" value={`#${data.globalRank}`} />
        <Metric label="Verified Solutions" value={String(data.verifiedSolutionsCount)} />
        <Metric label="Projects Built" value={String(data.projectsBuilt)} />
      </section>

      {/* Verified skills */}
      <Card>
        <div className="mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">terminal</span>
          <h2 className="text-headline-sm">Verified Skills</h2>
        </div>
        <div className="flex flex-wrap gap-sm">
          {data.skills.map((s) => (
            <div key={s} className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 transition-colors hover:border-secondary">
              <span className="font-label-md">{s}</span>
              <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Contributions + timeline */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
        <div className="flex flex-col gap-md lg:col-span-2">
          {/* Live solutions */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
              <h3 className="text-headline-sm">Live Solutions</h3>
              <span className="text-[10px] uppercase tracking-wider text-outline">CRCE OS Verified</span>
            </div>
            <div className="divide-y divide-outline-variant/40">
              {data.solutions.map((s) => (
                <div key={s.id} className="flex flex-col justify-between gap-sm p-md md:flex-row md:items-center">
                  <div>
                    <h4 className="text-body-lg font-bold">{s.name}</h4>
                    <p className="text-sm text-on-surface-variant">{s.description}</p>
                  </div>
                  <div className="flex gap-sm">
                    {s.appUrl && (
                      <a href={s.appUrl} className="flex items-center gap-xs font-label-md text-secondary">
                        View App <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                      </a>
                    )}
                    {s.githubUrl && (
                      <a href={s.githubUrl} className="flex items-center gap-xs font-label-md text-on-surface-variant">
                        GitHub <span className="material-symbols-outlined text-[16px]" aria-hidden="true">code</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Research + hackathons */}
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            {data.research[0] && (
              <Card className="flex flex-col gap-sm">
                <div className="flex items-center gap-xs text-label-md uppercase tracking-wider text-outline">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">menu_book</span> Research
                </div>
                <h4 className="text-body-lg font-bold">{data.research[0].title}</h4>
                <p className="text-sm text-on-surface-variant">
                  {data.research[0].description ?? `${data.research[0].venue}, ${data.research[0].year}`}
                </p>
                {data.research[0].url && (
                  <a href={data.research[0].url} className="mt-sm inline-block font-label-md text-secondary">Read Publication →</a>
                )}
              </Card>
            )}
            {data.hackathons[0] && (
              <Card className="flex flex-col gap-sm">
                <div className="flex items-center gap-xs text-label-md uppercase tracking-wider text-outline">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">emoji_events</span> Hackathons
                </div>
                <h4 className="text-body-lg font-bold">{data.hackathons[0].title}</h4>
                <p className="text-sm text-on-surface-variant">{data.hackathons[0].description}</p>
                <span className="inline-block w-fit rounded bg-secondary/10 px-3 py-1 font-label-md text-secondary">
                  {data.hackathons[0].badge}
                </span>
              </Card>
            )}
          </div>
        </div>

        {/* Timeline */}
        <Card className="h-fit">
          <div className="mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">timeline</span>
            <h2 className="text-headline-sm">Innovation Timeline</h2>
          </div>
          <ol className="relative flex flex-col gap-lg before:absolute before:bottom-0 before:left-[11px] before:top-2 before:w-0.5 before:bg-outline-variant/40">
            {data.timeline.map((t, i) => (
              <li key={t.id} className="relative pl-gutter">
                <span
                  className={`absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-4 border-surface-container-lowest ${
                    i === 0 ? 'bg-secondary' : i === data.timeline.length - 1 ? 'bg-secondary/20' : 'bg-outline-variant'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[10px] uppercase tracking-wider text-outline">{fmtMonth(t.date)}</span>
                <h4 className="mt-1 text-body-md font-bold">{t.title}</h4>
                <p className="text-sm text-on-surface-variant">{t.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* CTA */}
      <section className="space-y-md rounded-2xl bg-secondary px-md py-lg text-center text-on-secondary">
        <h2 className="text-3xl font-bold md:text-display">Work with {firstName}</h2>
        <p className="mx-auto max-w-2xl text-body-lg opacity-90">
          Open for specialized project collaborations, research assistance, and technical consultation for campus innovations.
        </p>
        <div className="flex flex-col justify-center gap-sm pt-sm sm:flex-row">
          <button type="button" className="rounded-lg bg-surface-container-lowest px-lg py-sm font-label-md font-bold text-secondary transition-transform active:scale-95">
            Hire for Projects
          </button>
          <button type="button" className="rounded-lg border border-white/20 bg-white/10 px-lg py-sm font-label-md font-bold text-on-secondary transition-transform hover:bg-white/20 active:scale-95">
            Connect on LinkedIn
          </button>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <span className="text-label-md uppercase text-outline">{label}</span>
      <span className="text-3xl font-black text-secondary md:text-4xl">{value}</span>
    </Card>
  )
}
