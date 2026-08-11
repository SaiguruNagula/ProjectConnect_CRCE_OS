/**
 * Student Profile — the editable SOURCE OF TRUTH for a student's identity, on
 * the Stitch "Private Identity Hub" layout. Editable personal data (bio,
 * pronouns, location, academic registry, socials, personal skills, visibility)
 * is read from and written to profileService. Verified/generated metrics (rank,
 * contributions, badges, verified skills, achievements) are read-only from the
 * portfolio view model and the credit engine — the student can never edit those
 * here. The public Portfolio is composed from this same profile source, so an
 * edit made here propagates there without re-entry. App chrome is owned by
 * StudentLayout.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { profileService, portfolioService, creditsService } from '@/services/catalog.service'
import type { CreditSummary, Portfolio, ProfileAchievement, ProfileVisibility, StudentProfile } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

/** Share of editable identity fields the student has filled in (0–100). */
function completionPct(p: StudentProfile): number {
  const checks = [
    p.bio,
    p.headline,
    p.department,
    p.github,
    p.linkedin,
    p.location,
    p.pronouns,
    p.rollNumber,
    p.batch,
    p.personalSkills.length,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function StudentProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const profile = useAsync<StudentProfile>(() => profileService.get())
  const portfolio = useAsync<Portfolio>(() => portfolioService.get('me'))
  const credits = useAsync<CreditSummary>(() => creditsService.summary())

  // Visibility is owned by the profile; mirror it locally for instant feedback
  // and persist every change back to the source of truth.
  const [visibility, setVisibility] = useState<ProfileVisibility | null>(null)
  useEffect(() => {
    if (profile.data) setVisibility(profile.data.visibility)
  }, [profile.data])

  // Inline edit mode: a draft copy of the editable identity fields the student
  // can Save (persist to the profile source of truth) or Cancel (discard).
  const [draft, setDraft] = useState<StudentProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [newSkill, setNewSkill] = useState('')

  if (profile.loading) return <PageLoader />
  if (profile.error || !profile.data) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="error" title="Couldn't load your profile" description={profile.error ?? undefined} />
      </div>
    )
  }

  const identity = profile.data
  const verified = portfolio.data
  // While editing, render from the draft so inputs are controlled; otherwise
  // from the persisted identity.
  const view = draft ?? identity
  const editing = draft !== null
  const pct = completionPct(view)
  const email = view.institutionalEmail ?? user?.email ?? ''

  function startEdit() {
    setDraft(structuredClone(identity))
  }
  function cancelEdit() {
    setDraft(null)
    setNewSkill('')
  }
  function setField<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }
  function addSkill() {
    const s = newSkill.trim()
    if (!s || !draft || draft.personalSkills.includes(s)) return
    setField('personalSkills', [...draft.personalSkills, s])
    setNewSkill('')
  }
  function removeSkill(skill: string) {
    if (!draft) return
    setField('personalSkills', draft.personalSkills.filter((s) => s !== skill))
  }
  async function saveEdit() {
    if (!draft) return
    setSaving(true)
    await profileService.update({
      name: draft.name,
      headline: draft.headline,
      tagline: draft.tagline,
      bio: draft.bio,
      department: draft.department,
      batch: draft.batch,
      rollNumber: draft.rollNumber,
      pronouns: draft.pronouns,
      location: draft.location,
      github: draft.github,
      linkedin: draft.linkedin,
      personalSkills: draft.personalSkills,
    })
    setSaving(false)
    setDraft(null)
    setNewSkill('')
    profile.reload()
    portfolio.reload() // portfolio composes profile fields — keep the preview fresh
  }

  function toggle(key: keyof ProfileVisibility) {
    setVisibility((v) => {
      if (!v) return v
      const next = { ...v, [key]: !v[key] }
      void profileService.update({ visibility: next })
      return next
    })
  }

  function handleSignOut() {
    logout()
    navigate(ROUTES.PUBLIC.LOGIN)
  }

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-md">
      {/* Status header */}
      <div className="flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div>
          <div className="mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">
              lock
            </span>
            <span className="text-label-md font-medium uppercase tracking-widest text-secondary">Private Identity Hub</span>
          </div>
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface">{identity.name}</h1>
          <p className="text-body-md text-on-surface-variant">Manage your institutional data and portfolio visibility.</p>
        </div>
        <Card className="flex items-center gap-md border-secondary/20 bg-secondary/5">
          <CompletionRing pct={pct} />
          <div>
            <p className="text-label-md font-bold text-on-surface">Profile Completion</p>
            <p className="text-label-md text-on-surface-variant">
              {pct < 100 ? 'Complete your profile to reach 100%' : 'Your identity hub is complete'}
            </p>
          </div>
        </Card>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-md md:grid-cols-12">
        {/* Quick stats (verified — read-only) */}
        <div className="grid grid-cols-2 gap-md md:col-span-12 lg:grid-cols-4">
          <StatTile label="Credits">
            <span className="text-headline-md font-semibold text-secondary">{credits.data?.total ?? '—'}</span>
            <span className="text-label-md text-on-surface-variant">/ {credits.data?.nextMilestone ?? '—'}</span>
          </StatTile>
          <StatTile label="Platform Rank">
            <span className="text-headline-md font-semibold text-on-surface">#{verified?.globalRank ?? '—'}</span>
            {verified?.rankPercentile && <span className="text-label-md text-on-surface-variant">{verified.rankPercentile}</span>}
          </StatTile>
          <StatTile label="Project Contributions">
            <span className="text-headline-md font-semibold text-on-surface">{verified?.projectsBuilt ?? '—'}</span>
            <span className="material-symbols-outlined text-[16px] text-green-600" aria-hidden="true">trending_up</span>
          </StatTile>
          <StatTile label="Verified Badges">
            <span className="text-headline-md font-semibold text-on-surface">{verified?.facultyValidationCount ?? '—'}</span>
          </StatTile>
        </div>

        {/* Identity + Academic (editable source of truth) */}
        <div className="flex flex-col gap-md md:col-span-8">
          <SectionCard>
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-headline-sm font-semibold text-on-surface">Identity Management</h3>
              {editing ? (
                <div className="flex items-center gap-xs">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-lg px-sm py-xs text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-xs rounded-lg bg-secondary px-sm py-xs text-label-md font-medium text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-xs rounded-lg p-xs text-secondary transition-colors hover:bg-secondary/5"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                  <span className="text-label-md font-medium">Edit Profile</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Field label="Bio" />
                {editing ? (
                  <textarea
                    value={view.bio}
                    onChange={(e) => setField('bio', e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-md text-on-surface focus:border-secondary focus:outline-none"
                  />
                ) : (
                  <p className="text-body-md leading-relaxed text-on-surface">{view.bio}</p>
                )}
              </div>
              <div className="space-y-md">
                <div>
                  <Field label="Pronouns" />
                  {editing ? (
                    <TextInput value={view.pronouns ?? ''} onChange={(v) => setField('pronouns', v)} placeholder="e.g. She / Her" />
                  ) : (
                    view.pronouns && <p className="text-body-md text-on-surface">{view.pronouns}</p>
                  )}
                </div>
                <div>
                  <Field label="Location" />
                  {editing ? (
                    <TextInput value={view.location ?? ''} onChange={(v) => setField('location', v)} placeholder="e.g. Mumbai, IN" />
                  ) : (
                    view.location && (
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">location_on</span>
                        <p className="text-body-md text-on-surface">{view.location}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="mb-md text-headline-sm font-semibold text-on-surface">Academic Registry</h3>
            <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
              <Registry label="Department" value={view.department} editing={editing} onChange={(v) => setField('department', v)} />
              <Registry label="Batch / Year" value={view.batch} editing={editing} onChange={(v) => setField('batch', v)} />
              <Registry label="Roll Number" value={view.rollNumber} editing={editing} onChange={(v) => setField('rollNumber', v)} />
              <div>
                <Field label="Institutional Email" />
                <div className="flex items-center gap-xs">
                  <p className="text-body-md font-semibold text-on-surface">{email}</p>
                  <span
                    className="material-symbols-outlined text-[16px] text-green-600"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                    title="Verified"
                    aria-label="Verified"
                  >
                    verified
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Connectivity + Visibility (editable) */}
        <div className="flex flex-col gap-md md:col-span-4">
          <SectionCard>
            <h3 className="mb-md text-headline-sm font-semibold text-on-surface">Connected Accounts</h3>
            <div className="space-y-sm">
              {editing ? (
                <>
                  <div>
                    <Field label="GitHub" />
                    <TextInput value={view.github ?? ''} onChange={(v) => setField('github', v)} placeholder="github username" />
                  </div>
                  <div>
                    <Field label="LinkedIn" />
                    <TextInput value={view.linkedin ?? ''} onChange={(v) => setField('linkedin', v)} placeholder="linkedin handle" />
                  </div>
                </>
              ) : (
                <>
                  {view.github && <AccountRow icon="code" name="GitHub" handle={`@${view.github}`} />}
                  {view.linkedin && <AccountRow icon="link" name="LinkedIn" handle={`/in/${view.linkedin}`} />}
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex w-full items-center justify-center gap-sm rounded-lg border border-dashed border-outline-variant p-sm text-on-surface-variant transition-all hover:border-secondary hover:text-secondary"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">add</span>
                    <span className="text-label-md font-medium">Add Portfolio Link</span>
                  </button>
                </>
              )}
            </div>
          </SectionCard>

          <Card className="border-none bg-zinc-900 text-white">
            <h3 className="mb-sm text-headline-sm font-semibold text-white">Public Visibility</h3>
            <p className="mb-md text-body-md text-zinc-400">Controls which data points are visible on your public Portfolio module.</p>
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <span className="text-body-md">Global Visibility</span>
                <Switch checked={visibility?.publicProfile ?? false} onChange={() => toggle('publicProfile')} label="Global visibility" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-zinc-300">Show Contact Info</span>
                <Switch checked={visibility?.showContact ?? false} onChange={() => toggle('showContact')} label="Show contact info" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-zinc-300">Show Social Links</span>
                <Switch checked={visibility?.showSocials ?? false} onChange={() => toggle('showSocials')} label="Show social links" />
              </div>
            </div>
            <Link
              to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' })}
              className="mt-md block w-full rounded-lg bg-white py-sm text-center text-label-md font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              View Public Profile
            </Link>
          </Card>
        </div>

        {/* Skill Matrix — verified (read-only) + personal (editable) */}
        <SectionCard className="md:col-span-12">
          <h3 className="mb-md text-headline-sm font-semibold text-on-surface">Skill Matrix</h3>
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
            <div>
              <div className="mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">
                  workspace_premium
                </span>
                <h4 className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">Verified Institutional Skills</h4>
              </div>
              <div className="flex flex-wrap gap-sm">
                {(verified?.skills ?? []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-xs rounded-full border border-secondary/20 bg-secondary-container/20 px-sm py-xs text-label-md font-bold text-secondary"
                  >
                    {s}
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>
                  </span>
                ))}
              </div>
              <p className="mt-sm text-label-md italic text-on-surface-variant">
                These skills are earned through verified project completions and academic performance.
              </p>
            </div>
            <div>
              <div className="mb-md flex items-center justify-between">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">person</span>
                  <h4 className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">Personal Skills</h4>
                </div>
                {!editing && (
                  <button type="button" onClick={startEdit} className="text-label-md font-medium text-secondary hover:underline">+ Add Skill</button>
                )}
              </div>
              <div className="flex flex-wrap gap-sm">
                {view.personalSkills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-xs rounded-full border border-outline-variant bg-surface-container px-sm py-xs text-label-md text-on-surface-variant"
                  >
                    {s}
                    {editing && (
                      <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`} className="text-on-surface-variant hover:text-error">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="mt-md flex gap-sm">
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="Add a skill and press Enter"
                    className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs text-label-md text-on-surface focus:border-secondary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-lg border border-outline-variant px-sm py-xs text-label-md font-medium text-secondary transition-colors hover:bg-secondary/5"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Achievements (verified — read-only) */}
        <SectionCard className="md:col-span-8">
          <h3 className="mb-md text-headline-sm font-semibold text-on-surface">Verified Achievements</h3>
          {verified?.verifiedAchievements && verified.verifiedAchievements.length > 0 ? (
            <div className="flex max-h-[300px] flex-col gap-md overflow-y-auto pr-sm">
              {verified.verifiedAchievements.map((a) => (
                <AchievementRow key={a.title} achievement={a} />
              ))}
            </div>
          ) : (
            <EmptyState icon="military_tech" title="No verified achievements yet" />
          )}
        </SectionCard>

        {/* Account settings */}
        <SectionCard className="md:col-span-4">
          <h3 className="mb-md text-headline-sm font-semibold text-on-surface">Account Settings</h3>
          {/* ponytail: notification/security/data settings need backend endpoints
              that do not exist yet — dropped rather than shipped as inert rows. */}
          <div className="space-y-md">
            <SettingRow
              icon="badge"
              title="Public Portfolio"
              detail="Review how your profile appears to visitors"
              to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: 'me' })}
            />
            <SettingRow
              icon="savings"
              title="Credit Ledger"
              detail="Every credit awarded, and why"
              to={ROUTES.STUDENT.CREDITS}
            />
            <div className="mt-lg border-t border-outline-variant pt-md">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-sm rounded-lg p-sm text-error transition-colors hover:bg-error/5"
              >
                <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                <span className="text-label-md font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function SectionCard({ className, children }: { className?: string; children: ReactNode }) {
  return <Card className={cn('shadow-sm transition-shadow hover:shadow-md', className)}>{children}</Card>
}

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col justify-between shadow-sm transition-shadow hover:shadow-md">
      <span className="text-label-md uppercase text-on-surface-variant">{label}</span>
      <div className="mt-sm flex items-baseline gap-xs">{children}</div>
    </Card>
  )
}

function Field({ label }: { label: string }) {
  return <label className="mb-base block text-label-md uppercase text-on-surface-variant">{label}</label>
}

function Registry({
  label,
  value,
  editing,
  onChange,
}: {
  label: string
  value?: string
  editing?: boolean
  onChange?: (v: string) => void
}) {
  return (
    <div>
      <Field label={label} />
      {editing ? (
        <TextInput value={value ?? ''} onChange={(v) => onChange?.(v)} />
      ) : (
        <p className="text-body-md font-semibold text-on-surface">{value ?? '—'}</p>
      )}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs text-body-md text-on-surface focus:border-secondary focus:outline-none"
    />
  )
}

function AccountRow({ icon, name, handle }: { icon: string; name: string; handle: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-sm">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-on-surface" aria-hidden="true">{icon}</span>
        <span className="text-body-md text-on-surface">{name}</span>
      </div>
      <span className="text-label-md text-secondary">{handle}</span>
    </div>
  )
}

function AchievementRow({ achievement }: { achievement: ProfileAchievement }) {
  return (
    <div className="flex items-start gap-md rounded-xl border border-transparent p-sm transition-colors hover:border-outline-variant hover:bg-surface-container-low">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/5 text-secondary">
        <span className="material-symbols-outlined" aria-hidden="true">{achievement.icon}</span>
      </div>
      <div>
        <h4 className="text-body-md font-bold text-on-surface">{achievement.title}</h4>
        <p className="text-body-md text-on-surface-variant">{achievement.description}</p>
        <Badge tone="primary" className="mt-xs rounded uppercase">{achievement.tag}</Badge>
      </div>
    </div>
  )
}

function SettingRow({ icon, title, detail, to }: { icon: string; title: string; detail: string; to: string }) {
  return (
    <Link to={to} className="group block rounded-lg p-sm transition-colors hover:bg-surface-container-low">
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary" aria-hidden="true">{icon}</span>
        <div>
          <p className="text-body-md font-bold text-on-surface">{title}</p>
          <p className="text-label-md text-on-surface-variant">{detail}</p>
        </div>
      </div>
    </Link>
  )
}

function CompletionRing({ pct }: { pct: number }) {
  return (
    <div className="relative h-12 w-12">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" className="stroke-surface-container-high" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${pct}, 100`}
          className="stroke-secondary"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-label-md font-bold text-secondary">{pct}%</div>
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        checked ? 'bg-secondary' : 'bg-zinc-700',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all',
          checked ? 'left-[22px]' : 'left-[2px]',
        )}
      />
    </button>
  )
}
