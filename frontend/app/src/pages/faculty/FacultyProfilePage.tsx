/**
 * Faculty Profile — faithful migration of the Stitch "Faculty Profile · Production
 * Master Edition" (frontend/crce_os_faculty_profile_production_master_edition):
 * an institutional identity header, About + Reputation cards, a verified impact
 * bento grid, an expertise/badges/portfolio rail, review-engine gauges, and a
 * slide-over Edit drawer.
 *
 * EDITABLE identity flows through useFacultyProfile → facultyProfileService.
 * VERIFIED contribution data is read-only, sourced from the contribution
 * services (problems / reviews / dashboard / leaderboard) and the faculty
 * reputation record — the faculty can never edit those numbers. App chrome
 * (sidebar, top bar, mobile nav) is owned by FacultyLayout.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useFacultyProfile } from '@/hooks/useFacultyProfile'
import { useAsync } from '@/hooks/useAsync'
import {
  facultyProfileService,
  problemsService,
  reviewsService,
  dashboardService,
  leaderboardService,
} from '@/services/catalog.service'
import type {
  DashboardStats,
  FacultyProfile,
  FacultyReputation,
  FacultyVisibility,
  LeaderboardEntry,
  Problem,
  ReviewStats,
} from '@/types/domain'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TagInput } from '@/components/ui/TagInput'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { Banner } from '@/components/feedback/Banner'
import { EmptyState } from '@/components/ui/EmptyState'

const VISIBILITY_LABEL: Record<FacultyVisibility, string> = {
  public: 'Public Visibility',
  institutional: 'Institutional Only',
  faculty: 'Faculty Only',
}

export function FacultyProfilePage() {
  const { profile, loading, error, saving, saveError, saved, save, dismissSaved, dismissSaveError } =
    useFacultyProfile()
  const reputation = useAsync<FacultyReputation>(() => facultyProfileService.reputation())
  const problems = useAsync<Problem[]>(() => problemsService.list())
  const reviewStats = useAsync<ReviewStats>(() => reviewsService.stats())
  const facultyStats = useAsync<DashboardStats[]>(() => dashboardService.stats('faculty'))
  const leaderboard = useAsync<LeaderboardEntry[]>(() => leaderboardService.faculty())

  const [editing, setEditing] = useState(false)

  if (loading) return <PageLoader />
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="error" title="Couldn't load your profile" description={error ?? undefined} />
      </div>
    )
  }

  const rep = reputation.data
  const stat = (label: string) => facultyStats.data?.find((s) => s.label === label)?.value ?? '—'
  const rank = leaderboard.data?.find((e) => e.name === profile.name)?.rank ?? rep?.rank
  const problemsCreated = problems.data?.filter((p) => p.facultyName === profile.name).length

  const impact = [
    { icon: 'problem', value: problemsCreated ?? '—', label: 'Problems Created', caption: 'Published', primary: false },
    { icon: 'fact_check', value: reviewStats.data?.completed ?? '—', label: 'Reviews Completed', caption: 'Verified', primary: false },
    { icon: 'groups', value: stat('Students Guided'), label: 'Students Mentored', caption: 'Guided', primary: false },
    { icon: 'token', value: stat('Credits Awarded'), label: 'Credits Awarded', caption: 'Awarded', primary: true },
  ]

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg">
      {saved && (
        <Banner tone="success" icon="check_circle" onClose={dismissSaved}>
          Profile updated.
        </Banner>
      )}

      {/* Identity header */}
      <section className="relative flex flex-col items-start gap-lg overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg md:flex-row md:items-center">
        <span
          className="material-symbols-outlined pointer-events-none absolute right-lg top-lg text-[120px] text-on-surface opacity-5"
          aria-hidden="true"
        >
          account_balance
        </span>
        <Avatar
          initials={profile.avatarInitials}
          className="h-32 w-32 shrink-0 rounded-2xl border-2 border-secondary/20 text-3xl shadow-sm md:h-40 md:w-40"
        />
        <div className="flex-grow">
          <div className="mb-xs flex flex-wrap items-center gap-sm">
            <h1 className="text-headline-lg font-bold tracking-tight text-primary">{profile.name}</h1>
            {rank && (
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-sm py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Rank: {String(rank).padStart(2, '0')}
              </span>
            )}
          </div>
          <p className="mb-md text-headline-sm text-on-surface-variant">
            {profile.designation} • <span className="font-bold text-primary">{profile.department}</span>
          </p>
          <div className="flex flex-wrap gap-md">
            <span className="flex items-center gap-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">fingerprint</span>
              <span className="font-mono text-mono">{profile.facultyId}</span>
            </span>
            <span className="flex items-center gap-xs font-bold text-secondary">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                alternate_email
              </span>
              <span className="text-body-md">{profile.email}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-sm self-stretch md:self-auto md:border-l md:border-outline-variant md:pl-lg">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm font-bold text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
            Edit Profile
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-lg py-sm font-bold text-primary transition-all hover:bg-surface-container-low active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">share</span>
            Export Dossier
          </button>
        </div>
      </section>

      {/* About + Reputation */}
      <div className="grid grid-cols-1 gap-lg md:grid-cols-12">
        <PanelCard title="About Faculty" icon="person_search" className="md:col-span-7">
          <p className="text-body-md leading-relaxed text-on-surface-variant">{profile.bio}</p>
          <div className="grid grid-cols-2 gap-md">
            <MiniFact label="Teaching Focus" value={profile.teachingFocus} />
            <MiniFact label="Innovation Focus" value={profile.innovationFocus} />
          </div>
        </PanelCard>

        <PanelCard
          title="Reputation"
          icon="verified"
          className="md:col-span-5"
          action={
            rep && (
              <span className="rounded-full bg-secondary/10 px-2 py-1 text-[10px] font-black uppercase text-secondary">
                {rep.percentileLabel}
              </span>
            )
          }
        >
          {reputation.loading ? (
            <PageLoader />
          ) : (
            <div className="flex flex-col gap-md">
              {rep?.scores.map((s) => (
                <div key={s.label} className="flex flex-col gap-xs">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-on-surface-variant">
                    <span>{s.label}</span>
                    <span>{s.value}/100</span>
                  </div>
                  <ProgressBar value={s.value} className="h-1.5" indicatorClassName="bg-secondary" />
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      {/* Verified impact grid */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-4">
        {impact.map((m) => (
          <div
            key={m.label}
            className={cn(
              'flex flex-col gap-xs rounded-xl border p-lg shadow-sm transition-all hover:-translate-y-0.5 hover:border-secondary',
              m.primary ? 'border-transparent bg-primary text-on-primary' : 'border-outline-variant bg-surface-container-lowest',
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn('material-symbols-outlined', m.primary ? 'text-on-primary' : 'text-on-surface-variant')}
                style={m.primary ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                {m.icon}
              </span>
              <span className={cn('text-[10px] font-bold uppercase', m.primary ? 'opacity-70' : 'text-secondary')}>{m.caption}</span>
            </div>
            <p className={cn('mt-md text-4xl font-bold leading-none', m.primary ? 'text-on-primary' : 'text-primary')}>{m.value}</p>
            <p className={cn('text-[10px] font-bold uppercase tracking-widest', m.primary ? 'opacity-70' : 'text-on-surface-variant')}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Expertise rail + engine metrics */}
      <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-12">
        <div className="flex flex-col gap-lg lg:col-span-4">
          {/* Expertise Hub */}
          <PanelCard
            title="Expertise Hub"
            icon="psychology"
            action={
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary">{profile.experienceYears}+ Years</p>
                <p className="text-[8px] uppercase text-on-surface-variant">Experience</p>
              </div>
            }
          >
            <TagBlock title={`Research Domains (${profile.researchDomains.length})`}>
              {profile.researchDomains.map((d) => (
                <span key={d} className="rounded bg-surface-container px-md py-1 text-xs font-semibold text-primary">
                  {d}
                </span>
              ))}
            </TagBlock>
            <TagBlock title="Technical Mastery">
              {profile.skills.map((s) => (
                <span key={s} className="rounded border border-secondary/10 bg-secondary/5 px-md py-1 text-xs font-bold text-secondary">
                  {s}
                </span>
              ))}
            </TagBlock>
          </PanelCard>

          {/* Badges & Standings */}
          <PanelCard title="Badges & Standings" icon="military_tech">
            <div className="grid grid-cols-2 gap-sm">
              {rep?.badges.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-xs rounded-lg bg-surface-container-low p-md text-center">
                  <span className="material-symbols-outlined text-3xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                    {b.icon}
                  </span>
                  <p className="text-[10px] font-bold uppercase">{b.label}</p>
                </div>
              ))}
            </div>
            {rep?.nextBadge && (
              <div className="rounded-lg bg-primary p-md text-on-primary">
                <div className="mb-xs flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase">Next: {rep.nextBadge.label}</p>
                  <p className="font-mono text-sm font-bold">{rep.nextBadge.progress}%</p>
                </div>
                <ProgressBar value={rep.nextBadge.progress} className="h-1.5 bg-white/20" indicatorClassName="bg-secondary" />
              </div>
            )}
          </PanelCard>

          {/* Portfolio Snapshot */}
          <section className="rounded-xl border border-outline-variant bg-surface-container-low p-lg">
            <h3 className="mb-md text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Portfolio Snapshot</h3>
            <div className="flex flex-col gap-sm">
              {rep?.portfolio.map((p) => (
                <div key={p.label} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                  <span className="flex items-center gap-xs text-xs font-bold">
                    <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">{p.icon}</span>
                    {p.label} ({p.count})
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">open_in_new</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Engine Metrics */}
        <div className="lg:col-span-8">
          <PanelCard title="Engine Metrics" icon="query_stats">
            {reputation.loading ? (
              <PageLoader />
            ) : (
              <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
                {rep?.engineMetrics.map((m) => (
                  <div key={m.label} className="flex flex-col items-center gap-sm text-center">
                    <Gauge value={m.value} />
                    <div>
                      <p className="text-body-md font-bold text-on-surface">{m.label}</p>
                      <p className="text-[10px] uppercase text-on-surface-variant">{m.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </div>

      {editing && (
        <EditProfileDrawer
          profile={profile}
          saving={saving}
          error={saveError}
          onDismissError={dismissSaveError}
          onClose={() => setEditing(false)}
          onSave={async (patch) => {
            const ok = await save(patch)
            if (ok) setEditing(false)
          }}
        />
      )}
    </div>
  )
}

/* ---------- Edit drawer ---------- */

type DrawerErrors = { name?: string; email?: string; maxTeams?: string }

function EditProfileDrawer({
  profile,
  saving,
  error,
  onDismissError,
  onClose,
  onSave,
}: {
  profile: FacultyProfile
  saving: boolean
  error: string | null
  onDismissError: () => void
  onClose: () => void
  onSave: (patch: Partial<FacultyProfile>) => void
}) {
  const [draft, setDraft] = useState<FacultyProfile>(() => structuredClone(profile))
  const [errors, setErrors] = useState<DrawerErrors>({})

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof FacultyProfile>(key: K, value: FacultyProfile[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function validate(): boolean {
    const next: DrawerErrors = {}
    if (draft.name.trim().length < 2) next.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) next.email = 'Enter a valid email'
    if (!Number.isFinite(draft.maxTeams) || draft.maxTeams < 1) next.maxTeams = 'Must be at least 1'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit() {
    if (!validate()) return
    onSave({
      name: draft.name,
      avatarInitials: draft.avatarInitials,
      designation: draft.designation,
      department: draft.department,
      email: draft.email,
      phone: draft.phone,
      bio: draft.bio,
      teachingFocus: draft.teachingFocus,
      innovationFocus: draft.innovationFocus,
      experienceYears: draft.experienceYears,
      researchDomains: draft.researchDomains,
      skills: draft.skills,
      officeLocation: draft.officeLocation,
      maxTeams: draft.maxTeams,
      openForMentorship: draft.openForMentorship,
      visibility: draft.visibility,
      github: draft.github,
      linkedin: draft.linkedin,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit faculty profile"
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 flex h-full w-full flex-col bg-surface-container-lowest shadow-2xl md:w-[600px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest p-md">
          <h2 className="text-headline-sm font-semibold text-on-surface">Edit Faculty Profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-surface-container">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-grow space-y-lg overflow-y-auto p-md pb-32">
          {error && (
            <Banner tone="error" icon="error" onClose={onDismissError}>
              {error}
            </Banner>
          )}

          <DrawerSection title="Personal Information">
            <div className="flex items-center gap-md">
              <Avatar initials={draft.avatarInitials} size="lg" className="rounded-xl" />
              <DrawerField label="Full Name" error={errors.name} className="flex-grow">
                <input value={draft.name} onChange={(e) => set('name', e.target.value)} className={INPUT} aria-invalid={!!errors.name} />
              </DrawerField>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <DrawerField label="Designation">
                <input value={draft.designation} onChange={(e) => set('designation', e.target.value)} className={INPUT} />
              </DrawerField>
              <DrawerField label="Department">
                <input value={draft.department} onChange={(e) => set('department', e.target.value)} className={INPUT} />
              </DrawerField>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <DrawerField label="Email" error={errors.email}>
                <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} className={INPUT} aria-invalid={!!errors.email} />
              </DrawerField>
              <DrawerField label="Phone">
                <input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={INPUT} />
              </DrawerField>
            </div>
            <DrawerField label="Professional Bio">
              <textarea value={draft.bio} onChange={(e) => set('bio', e.target.value)} rows={4} className={cn(INPUT, 'resize-none')} />
            </DrawerField>
            <div className="grid grid-cols-2 gap-md">
              <DrawerField label="Teaching Focus">
                <input value={draft.teachingFocus} onChange={(e) => set('teachingFocus', e.target.value)} className={INPUT} />
              </DrawerField>
              <DrawerField label="Innovation Focus">
                <input value={draft.innovationFocus} onChange={(e) => set('innovationFocus', e.target.value)} className={INPUT} />
              </DrawerField>
            </div>
          </DrawerSection>

          <DrawerSection title="Expertise & Domains">
            <DrawerField label="Research Domains">
              <TagInput value={draft.researchDomains} onChange={(v) => set('researchDomains', v)} placeholder="Add domain..." tone="primary" />
            </DrawerField>
            <DrawerField label="Technical Mastery">
              <TagInput value={draft.skills} onChange={(v) => set('skills', v)} placeholder="Add skill..." tone="tertiary" />
            </DrawerField>
            <DrawerField label="Years of Experience">
              <input
                type="number"
                min={0}
                value={draft.experienceYears}
                onChange={(e) => set('experienceYears', Number(e.target.value))}
                className={INPUT}
              />
            </DrawerField>
          </DrawerSection>

          <DrawerSection title="Mentorship Settings">
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
              <div>
                <p className="text-sm font-bold text-on-surface">Open for Mentorship</p>
                <p className="text-[10px] text-on-surface-variant">Allow new student project requests</p>
              </div>
              <Toggle checked={draft.openForMentorship} onChange={(v) => set('openForMentorship', v)} label="Open for mentorship" />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <DrawerField label="Max Teams" error={errors.maxTeams}>
                <input
                  type="number"
                  min={1}
                  value={draft.maxTeams}
                  onChange={(e) => set('maxTeams', Number(e.target.value))}
                  className={INPUT}
                  aria-invalid={!!errors.maxTeams}
                />
              </DrawerField>
              <DrawerField label="Office Location">
                <input value={draft.officeLocation} onChange={(e) => set('officeLocation', e.target.value)} className={INPUT} />
              </DrawerField>
            </div>
          </DrawerSection>

          <DrawerSection title="Professional Links">
            <div className="grid grid-cols-2 gap-md">
              <DrawerField label="GitHub">
                <input value={draft.github ?? ''} onChange={(e) => set('github', e.target.value)} placeholder="username" className={INPUT} />
              </DrawerField>
              <DrawerField label="LinkedIn">
                <input value={draft.linkedin ?? ''} onChange={(e) => set('linkedin', e.target.value)} placeholder="handle" className={INPUT} />
              </DrawerField>
            </div>
          </DrawerSection>

          <DrawerSection title="OS Preferences & Visibility">
            <DrawerField label="Profile Visibility">
              <select value={draft.visibility} onChange={(e) => set('visibility', e.target.value as FacultyVisibility)} className={INPUT}>
                {(Object.keys(VISIBILITY_LABEL) as FacultyVisibility[]).map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </DrawerField>
          </DrawerSection>
        </div>

        <div className="sticky bottom-0 flex gap-md border-t border-outline-variant bg-surface-container-lowest p-md">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-grow rounded-lg border border-outline-variant py-3 font-bold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex-grow rounded-lg bg-primary py-3 font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- presentation helpers ---------- */

const INPUT =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-sm text-on-surface outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20'

function PanelCard({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string
  icon: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm', className)}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">{icon}</span>
          <h3 className="text-headline-sm font-semibold text-on-surface">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">{label}</p>
      <p className="text-xs font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function TagBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-sm text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{title}</p>
      <div className="flex flex-wrap gap-xs">{children}</div>
    </div>
  )
}

function Gauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative h-24 w-24">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" className="stroke-surface-container" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${pct}, 100`}
          className="stroke-secondary transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-headline-sm font-bold text-primary">{pct}</div>
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-md">
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{title}</p>
      {children}
    </section>
  )
}

function DrawerField({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('flex flex-col gap-xs', className)}>
      <span className="text-xs font-bold text-on-surface">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-10 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
        checked ? 'bg-secondary' : 'bg-outline-variant',
      )}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  )
}
