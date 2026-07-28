/**
 * Portfolio — the student's PUBLIC professional showcase, pixel-ported from the
 * Stitch "Public Portfolio". The layout is served read-only to visitors, but the
 * owner (viewing their own /portfolio/me as a signed-in student) gets an
 * independent curation layer: edit the headline/introduction, feature a subset
 * of skills, choose which sections appear, preview the public result, and
 * publish/unpublish. This curation lives in portfolioService.getCustomization —
 * separate from the Profile — so the student decides what the world sees without
 * re-entering profile data. Empty overrides fall back to the composed profile.
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { portfolioService } from '@/services/catalog.service'
import type { Portfolio, PortfolioCustomization } from '@/types/domain'
import { cn } from '@/utils/cn'
import { githubUrl, linkedinUrl } from '@/utils/social'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const HALL_ICON: Record<string, string> = {
  'Innovation Champion': 'military_tech',
  'Top Researcher': 'psychology',
  'Hackathon Hero': 'star',
}

const DEFAULT_CUSTOMIZATION: PortfolioCustomization = {
  published: true,
  headline: '',
  introduction: '',
  featuredSkills: [],
  sections: { solutions: true, research: true, hackathons: true, timeline: true },
}

type SectionKey = keyof PortfolioCustomization['sections']

function fmtMonth(iso: string): string {
  const d = new Date(`${iso}-01`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
}

export function PortfolioPage() {
  const { id = 'me' } = useParams()
  const { user, isAuthenticated } = useAuth()
  const { data, loading, error } = useAsync<Portfolio>(() => portfolioService.get(id), [id])

  const isOwner = id === 'me' && isAuthenticated && user?.role === 'student'
  // Curation belongs to the owner — a visitor's view is never filtered by it.
  const custState = useAsync<PortfolioCustomization>(
    () => (isOwner ? portfolioService.getCustomization() : Promise.resolve(DEFAULT_CUSTOMIZATION)),
    [isOwner],
  )

  const [draft, setDraft] = useState<PortfolioCustomization | null>(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  if (loading || custState.loading) return <PageLoader />
  if (error || !data) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="badge" title="Portfolio unavailable" description={error ?? undefined} />
      </div>
    )
  }

  const saved = custState.data ?? DEFAULT_CUSTOMIZATION
  // The customization in effect for display: the working draft while editing,
  // otherwise the persisted curation.
  const active = draft ?? saved
  const editing = draft !== null
  // Owner editing shows every section with controls; preview and public views
  // apply the curation the visitor would see.
  const showControls = editing && !preview
  const applyCuration = !showControls

  // Non-owners never see an unpublished portfolio.
  if (!active.published && !isOwner) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="visibility_off" title="This portfolio isn't published yet" />
      </div>
    )
  }

  const displayHeadline = active.headline.trim() || data.tagline
  const displayIntro = active.introduction.trim() || data.bio
  const verifiedSkills = data.skills
  const displaySkills = active.featuredSkills.length ? active.featuredSkills : verifiedSkills
  const skillPool = [...new Set([...verifiedSkills, ...(data.personalSkills ?? [])])]
  const sectionOn = (k: SectionKey) => (applyCuration ? active.sections[k] : true)
  const firstName = data.name.split(' ')[0]
  const contactEmail = data.institutionalEmail

  function startEdit() {
    setDraft(structuredClone(saved))
    setPreview(false)
  }
  function cancelEdit() {
    setDraft(null)
    setPreview(false)
  }
  function setDraftField(patch: Partial<PortfolioCustomization>) {
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }
  function toggleSection(key: SectionKey) {
    setDraft((d) => (d ? { ...d, sections: { ...d.sections, [key]: !d.sections[key] } } : d))
  }
  function toggleSkill(skill: string) {
    setDraft((d) => {
      if (!d) return d
      const base = d.featuredSkills.length ? d.featuredSkills : verifiedSkills
      const has = base.includes(skill)
      return { ...d, featuredSkills: has ? base.filter((s) => s !== skill) : [...base, skill] }
    })
  }
  async function save() {
    if (!draft) return
    setSaving(true)
    await portfolioService.updateCustomization(draft)
    setSaving(false)
    setDraft(null)
    setPreview(false)
    custState.reload()
  }
  async function togglePublish() {
    await portfolioService.updateCustomization({ published: !saved.published })
    custState.reload()
  }

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-md px-md py-lg md:px-lg">
      {isOwner && (
        <OwnerToolbar
          editing={editing}
          preview={preview}
          saving={saving}
          published={active.published}
          onEdit={startEdit}
          onCancel={cancelEdit}
          onSave={save}
          onTogglePreview={() => setPreview((p) => !p)}
          onTogglePublish={editing ? () => setDraftField({ published: !active.published }) : togglePublish}
        />
      )}

      {/* Hero bento */}
      <section className="grid grid-cols-1 gap-md lg:grid-cols-3">
        {/* Profile */}
        <Card className="flex flex-col items-center gap-md text-center md:flex-row md:items-start md:text-left lg:col-span-2">
          <Avatar initials={data.avatarInitials} className="h-32 w-32 rounded-xl text-3xl md:h-40 md:w-40" />
          <div className="flex-grow space-y-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-display">{data.name}</h1>
              {showControls ? (
                <input
                  value={active.headline}
                  onChange={(e) => setDraftField({ headline: e.target.value })}
                  placeholder={data.tagline}
                  className="mt-xs w-full rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs text-headline-sm text-secondary focus:border-secondary focus:outline-none"
                />
              ) : (
                <p className="text-headline-sm text-secondary">{displayHeadline}</p>
              )}
            </div>
            {showControls ? (
              <textarea
                value={active.introduction}
                onChange={(e) => setDraftField({ introduction: e.target.value })}
                placeholder={data.bio}
                rows={3}
                className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-md text-on-surface focus:border-secondary focus:outline-none"
              />
            ) : (
              <p className="max-w-xl text-body-md text-on-surface-variant">{displayIntro}</p>
            )}
            {/* Links come from the profile — rendered only where the student gave one. */}
            <div className="flex flex-wrap justify-center gap-sm md:justify-start">
              {data.github && (
                <a
                  href={githubUrl(data.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-xs rounded-lg bg-surface-container px-3 py-2 font-label-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">code</span> GitHub
                </a>
              )}
              {data.linkedin && (
                <a
                  href={linkedinUrl(data.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-xs rounded-lg bg-secondary-container/40 px-3 py-2 font-label-md text-on-surface transition-colors hover:bg-secondary-container/60"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">share</span> LinkedIn
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-xs rounded-lg bg-secondary px-4 py-2 font-label-md text-on-secondary transition-opacity hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>
                  Get in touch
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Validations + hall of fame */}
        <div className="flex flex-col gap-md">
          {data.facultyValidationCount > 0 && (
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
          )}

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

      {/* Verified skills — the student features a subset */}
      {(showControls || displaySkills.length > 0) && (
      <Card>
        <div className="mb-md flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">terminal</span>
            <h2 className="text-headline-sm">{showControls ? 'Featured Skills' : 'Verified Skills'}</h2>
          </div>
          {showControls && <span className="text-label-md text-on-surface-variant">Tap to show / hide on your portfolio</span>}
        </div>
        <div className="flex flex-wrap gap-sm">
          {showControls
            ? skillPool.map((s) => {
                const on = active.featuredSkills.length ? active.featuredSkills.includes(s) : verifiedSkills.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={cn(
                      'flex items-center gap-xs rounded-lg border px-4 py-2 transition-colors',
                      on ? 'border-secondary bg-secondary/5 text-on-surface' : 'border-outline-variant text-outline opacity-60',
                    )}
                  >
                    <span className="font-label-md">{s}</span>
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{on ? 'check_circle' : 'add_circle'}</span>
                  </button>
                )
              })
            : displaySkills.map((s) => (
                <div key={s} className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 transition-colors hover:border-secondary">
                  <span className="font-label-md">{s}</span>
                  <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
                </div>
              ))}
        </div>
      </Card>
      )}

      {/* Contributions + timeline */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
        <div className="flex flex-col gap-md lg:col-span-2">
          {/* Live solutions */}
          {data.solutions.length > 0 && (showControls || sectionOn('solutions')) && (
            <Card className={cn('overflow-hidden p-0', showControls && !active.sections.solutions && 'opacity-50')}>
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
                <h3 className="text-headline-sm">Live Solutions</h3>
                {showControls ? (
                  <SectionToggle on={active.sections.solutions} onClick={() => toggleSection('solutions')} />
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-outline">CRCE OS Verified</span>
                )}
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
                        <a href={s.appUrl} target="_blank" rel="noreferrer" className="flex items-center gap-xs font-label-md text-secondary">
                          View App <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                        </a>
                      )}
                      {s.githubUrl && (
                        <a href={s.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-xs font-label-md text-on-surface-variant">
                          GitHub <span className="material-symbols-outlined text-[16px]" aria-hidden="true">code</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Research + hackathons */}
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            {data.research[0] && (showControls || sectionOn('research')) && (
              <Card className={cn('flex flex-col gap-sm', showControls && !active.sections.research && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-xs text-label-md uppercase tracking-wider text-outline">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">menu_book</span> Research
                  </div>
                  {showControls && <SectionToggle on={active.sections.research} onClick={() => toggleSection('research')} />}
                </div>
                <h4 className="text-body-lg font-bold">{data.research[0].title}</h4>
                <p className="text-sm text-on-surface-variant">
                  {data.research[0].description ?? `${data.research[0].venue}, ${data.research[0].year}`}
                </p>
                {data.research[0].url && (
                  <a href={data.research[0].url} target="_blank" rel="noreferrer" className="mt-sm inline-block font-label-md text-secondary">
                    Read Publication →
                  </a>
                )}
              </Card>
            )}
            {data.hackathons[0] && (showControls || sectionOn('hackathons')) && (
              <Card className={cn('flex flex-col gap-sm', showControls && !active.sections.hackathons && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-xs text-label-md uppercase tracking-wider text-outline">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">emoji_events</span> Hackathons
                  </div>
                  {showControls && <SectionToggle on={active.sections.hackathons} onClick={() => toggleSection('hackathons')} />}
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
        {data.timeline.length > 0 && (showControls || sectionOn('timeline')) && (
          <Card className={cn('h-fit', showControls && !active.sections.timeline && 'opacity-50')}>
            <div className="mb-md flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary" aria-hidden="true">timeline</span>
                <h2 className="text-headline-sm">Innovation Timeline</h2>
              </div>
              {showControls && <SectionToggle on={active.sections.timeline} onClick={() => toggleSection('timeline')} />}
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
        )}
      </div>

      {/* CTA */}
      <section className="space-y-md rounded-2xl bg-secondary px-md py-lg text-center text-on-secondary">
        <h2 className="text-3xl font-bold md:text-display">Work with {firstName}</h2>
        <p className="mx-auto max-w-2xl text-body-lg opacity-90">
          Open for specialized project collaborations, research assistance, and technical consultation for campus innovations.
        </p>
        <div className="flex flex-col justify-center gap-sm pt-sm sm:flex-row">
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Project collaboration with ${data.name}`)}`}
              className="rounded-lg bg-surface-container-lowest px-lg py-sm font-label-md font-bold text-secondary transition-transform active:scale-95"
            >
              Hire for Projects
            </a>
          )}
          {data.linkedin && (
            <a
              href={linkedinUrl(data.linkedin)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/20 bg-white/10 px-lg py-sm font-label-md font-bold text-on-secondary transition-transform hover:bg-white/20 active:scale-95"
            >
              Connect on LinkedIn
            </a>
          )}
        </div>
      </section>
    </div>
  )
}

function OwnerToolbar({
  editing,
  preview,
  saving,
  published,
  onEdit,
  onCancel,
  onSave,
  onTogglePreview,
  onTogglePublish,
}: {
  editing: boolean
  preview: boolean
  saving: boolean
  published: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onTogglePreview: () => void
  onTogglePublish: () => void
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest/95 px-md py-sm backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-secondary" aria-hidden="true">tune</span>
        <div>
          <p className="text-label-md font-bold text-on-surface">Your Portfolio</p>
          <p className="text-label-md text-on-surface-variant">
            {editing ? (preview ? 'Previewing public view' : 'Customizing — choose what the world sees') : 'This is how the public sees your work'}
          </p>
        </div>
        <span
          className={cn(
            'ml-sm flex items-center gap-xs rounded-full px-sm py-[2px] text-[10px] font-bold uppercase tracking-wider',
            published ? 'bg-green-600/10 text-green-700' : 'bg-outline-variant/40 text-outline',
          )}
        >
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{published ? 'public' : 'lock'}</span>
          {published ? 'Published' : 'Unpublished'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        <button
          type="button"
          onClick={onTogglePublish}
          className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-xs text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{published ? 'visibility_off' : 'publish'}</span>
          {published ? 'Unpublish' : 'Publish'}
        </button>
        {editing ? (
          <>
            <button
              type="button"
              onClick={onTogglePreview}
              className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-xs text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{preview ? 'edit' : 'visibility'}</span>
              {preview ? 'Back to editing' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg px-sm py-xs text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-xs rounded-lg bg-secondary px-sm py-xs text-label-md font-medium text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-xs rounded-lg bg-secondary px-sm py-xs text-label-md font-medium text-on-secondary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
            Customize Portfolio
          </button>
        )}
      </div>
    </div>
  )
}

function SectionToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex items-center gap-xs rounded-full border px-sm py-[2px] text-[10px] font-bold uppercase tracking-wider transition-colors',
        on ? 'border-secondary/40 text-secondary' : 'border-outline-variant text-outline',
      )}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{on ? 'visibility' : 'visibility_off'}</span>
      {on ? 'Public' : 'Hidden'}
    </button>
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
