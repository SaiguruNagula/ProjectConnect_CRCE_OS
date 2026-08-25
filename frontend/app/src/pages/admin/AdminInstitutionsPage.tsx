/**
 * Admin Institutions — the "Institution Governance" console. Faithful migration
 * of the Stitch prototype
 * (frontend/projectconnect_admin_institution_governance_master_console): a header
 * with quick actions, a six-tile KPI grid, the searchable/filterable institution
 * directory, a system audit log, and the 420px details drawer with the
 * administrative actions (edit profile, assign principal, verify, suspend).
 *
 * All data flows through useInstitutions() → adminService → AdminRepository; no
 * institution data is hardcoded in JSX and no business logic lives here. App
 * chrome (sidebar, top bar, mobile nav) is owned by AdminLayout / RoleLayout and
 * is intentionally not reproduced. Stitch's `success`/`warning` tokens map to
 * Tailwind emerald/amber (the app palette has no such tokens), matching the
 * Admin Dashboard and Admin Users pages.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useInstitutions } from '@/hooks/useInstitutions'
import type {
  AdminInstitution,
  InstitutionInput,
  InstitutionKpi,
  InstitutionStatus,
} from '@/types/domain'
import { ROUTES } from '@/constants/routes'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { downloadCsv } from '@/utils/csv'
import { initials } from '@/utils/initials'

const CARD = 'bg-surface-container-lowest border border-outline-variant rounded-lg'
const PAGE_SIZE = 10

/** Export shape of the directory — header order and fields in one place. */
const INSTITUTION_COLUMNS: { header: string; value: (i: AdminInstitution) => unknown }[] = [
  { header: 'Name', value: (i) => i.name },
  { header: 'Registered Name', value: (i) => i.fullName },
  { header: 'Code', value: (i) => i.code },
  { header: 'Type', value: (i) => i.type },
  { header: 'City', value: (i) => i.city },
  { header: 'State', value: (i) => i.state },
  { header: 'Principal', value: (i) => i.principal?.name ?? '' },
  { header: 'Students', value: (i) => i.students },
  { header: 'Faculty', value: (i) => i.faculty },
  { header: 'Projects', value: (i) => i.projects },
  { header: 'Credits', value: (i) => i.credits },
  { header: 'Status', value: (i) => i.status },
]
const INPUT =
  'w-full rounded border border-outline-variant bg-background px-2 py-1.5 text-[12px] text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary/50'
const SELECT =
  'min-w-[80px] rounded border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-secondary/50'

const STATUS_STYLE: Record<InstitutionStatus, { text: string; dot: string; pulse?: boolean }> = {
  active: { text: 'text-emerald-600', dot: 'bg-emerald-500' },
  pending: { text: 'text-amber-600', dot: 'bg-amber-500', pulse: true },
  suspended: { text: 'text-red-600', dot: 'bg-red-500' },
}

/** Compact campus-scale figure, e.g. 4284 → '4.2k' (Stitch truncates, not rounds). */
function compact(value: number): string {
  return value >= 1000 ? `${Math.floor(value / 100) / 10}k` : String(value)
}

/** Two-letter logo tile initials, e.g. 'D.J. Sanghvi' → 'DJ'. */
function codeInitials(name: string): string {
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
}

function KpiTile({ kpi }: { kpi: InstitutionKpi }) {
  const noteTone =
    kpi.tone === 'positive' ? 'text-emerald-600' : kpi.tone === 'critical' ? 'text-amber-600' : 'text-on-surface-variant'
  return (
    <div
      className={`rounded-lg border border-outline-variant p-4 ${
        kpi.ring ? 'bg-amber-500/[0.02] ring-1 ring-amber-500/20' : 'bg-surface-container-lowest'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          kpi.ring ? 'text-amber-600' : 'text-on-surface-variant'
        }`}
      >
        {kpi.label}
      </p>
      <h3 className="mt-1 text-2xl font-bold">{kpi.value}</h3>
      {kpi.progress != null ? (
        <div className="mt-2 h-1 w-full rounded-full bg-secondary/10">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${kpi.progress}%` }} />
        </div>
      ) : (
        kpi.note && <p className={`mt-1 text-[10px] font-medium ${noteTone}`}>{kpi.note}</p>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: InstitutionStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-on-surface-variant">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function SnapshotTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-background p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={`font-mono text-lg font-bold ${accent ? 'text-secondary' : ''}`}>{value.toLocaleString()}</p>
    </div>
  )
}

/**
 * Right-hand details drawer (Stitch: 420px). Read-only detail plus the
 * administrative actions — every action is delegated upward to the hook.
 */
function InstitutionDrawer({
  institution,
  busy,
  onClose,
  onEdit,
  onStatusChange,
}: {
  institution: AdminInstitution
  busy: boolean
  onClose: () => void
  onEdit: () => void
  onStatusChange: (status: InstitutionStatus) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const suspended = institution.status === 'suspended'

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-inverse-surface/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${institution.name} details`}
        className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container/10 p-6">
          <h3 className="text-lg font-bold">Institution Details</h3>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-full p-1 hover:bg-surface-container">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low text-2xl font-bold text-on-surface-variant shadow-sm">
                {codeInitials(institution.name)}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-surface-container-lowest text-white ${
                  institution.status === 'active' ? 'bg-emerald-500' : suspended ? 'bg-red-500' : 'bg-amber-500'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {institution.status === 'active' ? 'verified' : suspended ? 'block' : 'pending'}
                </span>
              </span>
            </div>
            <h4 className="px-4 text-lg font-bold">{institution.fullName}</h4>
            <div className="mt-2 flex justify-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  institution.status === 'active'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : suspended
                      ? 'border-red-500/20 bg-red-500/10 text-red-600'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                }`}
              >
                {institution.status === 'active' ? 'Verified' : institution.status}
              </span>
              <span className="rounded-full border border-secondary/10 bg-secondary/5 px-2 py-0.5 text-[10px] font-bold text-secondary">
                {institution.tier}
              </span>
            </div>
          </div>

          <section className="space-y-3">
            <h5 className="border-b border-outline-variant pb-1 text-[11px] font-bold uppercase text-on-surface-variant">
              Institutional Identity
            </h5>
            <div className="grid grid-cols-1 gap-2.5">
              <DetailRow label="Institution Code">
                <span className="rounded bg-background px-1.5 py-0.5 font-mono font-bold">{institution.code}</span>
              </DetailRow>
              <DetailRow label="Type">
                <span className="font-semibold">{institution.type}</span>
              </DetailRow>
              {institution.website && (
                <DetailRow label="Official Website">
                  <a
                    href={`https://${institution.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-secondary hover:underline"
                  >
                    {institution.website}
                  </a>
                </DetailRow>
              )}
              {institution.supportEmail && (
                <DetailRow label="Support Email">
                  <span className="font-medium">{institution.supportEmail}</span>
                </DetailRow>
              )}
              {institution.address && (
                <DetailRow label="Address">
                  <span className="block max-w-[200px] font-medium">{institution.address}</span>
                </DetailRow>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1">
              <h5 className="text-[11px] font-bold uppercase text-on-surface-variant">Principal Authority</h5>
              <button type="button" onClick={onEdit} className="text-[10px] font-bold text-secondary hover:underline">
                TRANSFER
              </button>
            </div>
            {institution.principal ? (
              <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-background p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-lg font-bold text-secondary">
                  {initials(institution.principal.name)}
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold">{institution.principal.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{institution.principal.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        institution.principal.verified ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        institution.principal.verified ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {institution.principal.verified ? 'Identity Verified' : 'Verification Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-outline-variant bg-background p-4 text-[11px] text-on-surface-variant">
                No principal assigned yet.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h5 className="border-b border-outline-variant pb-1 text-[11px] font-bold uppercase text-on-surface-variant">
              Ecosystem Snapshot
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <SnapshotTile label="Students" value={institution.students} />
              <SnapshotTile label="Faculty" value={institution.faculty} />
              <SnapshotTile label="Projects" value={institution.projects} />
              <SnapshotTile label="Credits" value={institution.credits} accent />
            </div>
          </section>

          {/* ponytail: no institution-scoped routes exist yet — these link to the
              nearest existing consoles rather than inventing filtered ones. */}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              to={ROUTES.ADMIN.USERS}
              className="group flex items-center justify-between rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary" aria-hidden="true">group</span>
                <span className="text-[12px] font-bold">View Associated Users</span>
              </span>
              <span className="material-symbols-outlined text-[18px] text-outline-variant" aria-hidden="true">chevron_right</span>
            </Link>
            <Link
              to={ROUTES.SHARED.SOLUTIONS}
              className="group flex items-center justify-between rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary" aria-hidden="true">assignment</span>
                <span className="text-[12px] font-bold">Browse Published Solutions</span>
              </span>
              <span className="material-symbols-outlined text-[18px] text-outline-variant" aria-hidden="true">chevron_right</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container/20 p-6">
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2.5 text-xs font-bold text-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span> Edit Institution Profile
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center justify-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest py-2 text-[11px] font-bold hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person_pin</span> Assign Principal
            </button>
            <button
              type="button"
              disabled={busy || institution.status === 'active'}
              onClick={() => onStatusChange('active')}
              className="flex items-center justify-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest py-2 text-[11px] font-bold hover:bg-surface-container disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
              {suspended ? 'Restore Access' : 'Verify Again'}
            </button>
          </div>
          <button
            type="button"
            disabled={busy || suspended}
            onClick={() => onStatusChange('suspended')}
            className="flex w-full items-center justify-center gap-2 rounded border border-red-500/50 bg-surface-container-lowest py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/5 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">block</span> Suspend Institution Access
          </button>
        </div>
      </aside>
    </div>
  )
}

type FormErrors = Partial<Record<keyof InstitutionInput, string>>

function toInput(institution: AdminInstitution | null): InstitutionInput {
  return {
    name: institution?.name ?? '',
    fullName: institution?.fullName ?? '',
    code: institution?.code ?? '',
    type: institution?.type ?? '',
    city: institution?.city ?? '',
    state: institution?.state ?? '',
    website: institution?.website ?? '',
    supportEmail: institution?.supportEmail ?? '',
    address: institution?.address ?? '',
    principalName: institution?.principal?.name ?? '',
    principalEmail: institution?.principal?.email ?? '',
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[10px] font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** Add / edit institution form. Minimal — only the fields the model carries. */
function InstitutionFormModal({
  institution,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  institution: AdminInstitution | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: InstitutionInput) => void
}) {
  const [draft, setDraft] = useState<InstitutionInput>(() => toInput(institution))
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof InstitutionInput>(key: K, value: InstitutionInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!draft.name.trim()) next.name = 'Display name is required'
    if (!draft.fullName.trim()) next.fullName = 'Registered name is required'
    if (!draft.code.trim()) next.code = 'Institution code is required'
    if (!draft.type.trim()) next.type = 'Type is required'
    if (!draft.city.trim()) next.city = 'City is required'
    if (!draft.state.trim()) next.state = 'State is required'
    if (draft.supportEmail && !EMAIL.test(draft.supportEmail.trim())) next.supportEmail = 'Enter a valid email'
    if (draft.principalEmail && !EMAIL.test(draft.principalEmail.trim())) next.principalEmail = 'Enter a valid email'
    if (draft.principalEmail?.trim() && !draft.principalName?.trim()) next.principalName = 'Name is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(draft)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-inverse-surface/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={institution ? `Edit ${institution.name}` : 'Add institution'}
        className="relative flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-t-lg border border-outline-variant bg-surface-container-lowest shadow-2xl sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-sm font-bold">{institution ? 'Edit Institution' : 'Add Institution'}</h3>
          <button type="button" onClick={onClose} aria-label="Close form" className="rounded-full p-1 hover:bg-surface-container">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {error && (
            <p role="alert" className="rounded border border-red-500/20 bg-red-500/5 p-2 text-[11px] font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Display Name" htmlFor="inst-name" error={errors.name} required>
              <input id="inst-name" autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} className={INPUT} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Institution Code" htmlFor="inst-code" error={errors.code} required>
              <input id="inst-code" value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="IN-MUM-01" className={`${INPUT} font-mono uppercase`} aria-invalid={!!errors.code} />
            </Field>
          </div>
          <Field label="Registered Name" htmlFor="inst-full-name" error={errors.fullName} required>
            <input id="inst-full-name" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} className={INPUT} aria-invalid={!!errors.fullName} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Type" htmlFor="inst-type" error={errors.type} required>
              <input id="inst-type" value={draft.type} onChange={(e) => set('type', e.target.value)} placeholder="Engineering" className={INPUT} aria-invalid={!!errors.type} />
            </Field>
            <Field label="City" htmlFor="inst-city" error={errors.city} required>
              <input id="inst-city" value={draft.city} onChange={(e) => set('city', e.target.value)} className={INPUT} aria-invalid={!!errors.city} />
            </Field>
            <Field label="State" htmlFor="inst-state" error={errors.state} required>
              <input id="inst-state" value={draft.state} onChange={(e) => set('state', e.target.value)} className={INPUT} aria-invalid={!!errors.state} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Official Website" htmlFor="inst-website">
              <input id="inst-website" value={draft.website} onChange={(e) => set('website', e.target.value)} placeholder="crce.edu.in" className={INPUT} />
            </Field>
            <Field label="Support Email" htmlFor="inst-email" error={errors.supportEmail}>
              <input id="inst-email" type="email" value={draft.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} className={INPUT} aria-invalid={!!errors.supportEmail} />
            </Field>
          </div>
          <Field label="Address" htmlFor="inst-address">
            <textarea id="inst-address" rows={2} value={draft.address} onChange={(e) => set('address', e.target.value)} className={`${INPUT} resize-none`} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Principal Name" htmlFor="inst-principal" error={errors.principalName}>
              <input id="inst-principal" value={draft.principalName} onChange={(e) => set('principalName', e.target.value)} className={INPUT} aria-invalid={!!errors.principalName} />
            </Field>
            <Field label="Principal Email" htmlFor="inst-principal-email" error={errors.principalEmail}>
              <input id="inst-principal-email" type="email" value={draft.principalEmail} onChange={(e) => set('principalEmail', e.target.value)} className={INPUT} aria-invalid={!!errors.principalEmail} />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-outline-variant bg-surface-container/20 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[11px] font-bold hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1.5 text-[11px] font-bold text-on-secondary transition-colors hover:bg-secondary/90 disabled:opacity-60"
          >
            {saving && <span className="material-symbols-outlined animate-spin text-[16px]" aria-hidden="true">progress_activity</span>}
            {saving ? 'Saving…' : institution ? 'Save Changes' : 'Add Institution'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AdminInstitutionsPage() {
  const {
    institutions,
    rows,
    options,
    filters,
    setFilter,
    clearFilters,
    loading,
    error,
    overview,
    saving,
    actionError,
    savedMessage,
    dismissSaved,
    dismissError,
    save,
    setStatus,
  } = useInstitutions()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  /** null = closed; { id: null } = create; { id } = edit. */
  const [form, setForm] = useState<{ id: string | null } | null>(null)

  const selected = useMemo(
    () => institutions.find((i) => i.id === selectedId) ?? null,
    [institutions, selectedId],
  )
  const editing = useMemo(
    () => (form?.id ? (institutions.find((i) => i.id === form.id) ?? null) : null),
    [institutions, form],
  )

  const allSelected = rows.length > 0 && rows.every((i) => selectedIds.includes(i.id))
  // Ticked rows win; otherwise export exactly what the filters are showing.
  const exportRows = useMemo(
    () => (selectedIds.length > 0 ? rows.filter((i) => selectedIds.includes(i.id)) : rows),
    [rows, selectedIds],
  )

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  // A narrowed filter can leave the reader on a page that no longer exists.
  useEffect(() => setPage(1), [filters])
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstOnPage = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1

  function toggleRow(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }

  async function handleSubmit(input: InstitutionInput) {
    const ok = await save(input, form?.id ?? undefined)
    if (ok) setForm(null)
  }

  async function handleStatus(status: InstitutionStatus) {
    if (!selected) return
    // Suspension cuts off every student and faculty member on that campus.
    if (
      status === 'suspended' &&
      !window.confirm(
        `Suspend ${selected.name}? Its ${selected.students.toLocaleString()} students and ${selected.faculty} faculty lose platform access until it is restored.`,
      )
    ) {
      return
    }
    await setStatus(selected.id, status)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 text-[13px] text-on-surface">
      {/* Header & quick actions */}
      <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Institutions</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Manage campus identities, principal assignments, and institutional scale.
          </p>
        </div>
        {/* ponytail: bulk actions need an endpoint that does not exist — dropped
            rather than shipped as an inert button. Export is real. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-1.5">
          <button
            type="button"
            disabled={exportRows.length === 0}
            onClick={() => downloadCsv('crce-os-institutions.csv', INSTITUTION_COLUMNS, exportRows)}
            className="flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">file_download</span>
            Export {exportRows.length > 0 && <span className="font-mono">({exportRows.length})</span>}
          </button>
          <div className="mx-1 h-6 w-px bg-outline-variant" />
          <button
            type="button"
            onClick={() => setForm({ id: null })}
            className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1.5 text-[11px] font-bold text-on-secondary transition-colors hover:bg-secondary/90"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add_business</span> Add Institution
          </button>
        </div>
      </div>

      <ActionBanner tone="success" message={savedMessage} onDismiss={dismissSaved} />
      {/* The form modal shows its own error inline — don't report it twice. */}
      <ActionBanner tone="error" message={form ? null : actionError} onDismiss={dismissError} />

      {/* KPI grid */}
      {overview && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {overview.kpis.map((kpi) => (
            <KpiTile key={kpi.label} kpi={kpi} />
          ))}
        </section>
      )}

      {/* Institution directory */}
      <section className={`${CARD} flex h-fit flex-col`}>
        <div className="flex flex-col justify-between gap-4 border-b border-outline-variant p-4 md:flex-row md:items-center">
          <h3 className="text-sm font-bold">Institution Directory</h3>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilter('query', e.target.value)}
                placeholder="Search by name, code, or principal..."
                aria-label="Search institutions"
                className="w-full rounded border border-outline-variant bg-background py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-secondary/50"
              />
            </div>
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
              <select aria-label="Filter by type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className={SELECT}>
                <option value="">Type</option>
                {options.types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select aria-label="Filter by state" value={filters.state} onChange={(e) => setFilter('state', e.target.value)} className={SELECT}>
                <option value="">State</option>
                {options.states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={`${SELECT} capitalize`}>
                <option value="">Status</option>
                {options.statuses.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : error ? (
          <EmptyState icon="error" title="Couldn't load institutions" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="domain_disabled"
            title={institutions.length === 0 ? 'No institutions yet' : 'No institutions match your filters'}
            description={
              institutions.length === 0
                ? 'Register the first partner campus to start onboarding students and faculty.'
                : undefined
            }
            action={
              <button
                type="button"
                onClick={() => (institutions.length === 0 ? setForm({ id: null }) : clearFilters())}
                className="rounded bg-secondary px-3 py-1.5 text-[11px] font-bold text-on-secondary hover:bg-secondary/90"
              >
                {institutions.length === 0 ? 'Add Institution' : 'Clear filters'}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <caption className="sr-only">Partner institutions registered on the platform</caption>
              <thead className="border-b border-outline-variant bg-surface-container/30 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all institutions"
                      checked={allSelected}
                      onChange={(e) => setSelectedIds(e.target.checked ? rows.map((i) => i.id) : [])}
                      className="rounded border-outline-variant text-secondary focus:ring-secondary/50"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">Institution</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3 text-center">Students</th>
                  <th scope="col" className="px-4 py-3 text-center">Faculty</th>
                  <th scope="col" className="px-4 py-3 text-center">Projects</th>
                  <th scope="col" className="px-4 py-3">Principal</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageRows.map((institution) => (
                  <tr
                    key={institution.id}
                    onClick={() => setSelectedId(institution.id)}
                    className="cursor-pointer transition-colors hover:bg-surface-container/40"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${institution.name}`}
                        checked={selectedIds.includes(institution.id)}
                        onChange={() => toggleRow(institution.id)}
                        className="rounded border-outline-variant text-secondary focus:ring-secondary/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container text-[10px] font-bold uppercase text-on-surface-variant">
                          {codeInitials(institution.name)}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(institution.id)
                            }}
                            className="font-bold text-secondary hover:underline"
                          >
                            {institution.name}
                          </button>
                          <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                            {institution.code} • {institution.city}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-medium">{institution.type}</span></td>
                    <td className="px-4 py-3 text-center font-mono font-medium">{compact(institution.students)}</td>
                    <td className="px-4 py-3 text-center font-mono font-medium">{institution.faculty}</td>
                    <td className="px-4 py-3 text-center font-mono font-medium">{institution.projects}</td>
                    <td className="px-4 py-3">
                      {institution.principal ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-[9px] font-bold text-secondary">
                            {initials(institution.principal.name)}
                          </span>
                          <span className="text-[11px] font-medium">{institution.principal.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-on-surface-variant">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={institution.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Open details for ${institution.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(institution.id)
                        }}
                        className="rounded p-1 hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-outline-variant bg-surface-container/10 p-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            summary={`Showing ${firstOnPage}–${Math.min(page * PAGE_SIZE, rows.length)} of ${rows.length} institutions`}
          />
          {totalPages <= 1 && (
            <p className="text-[10px] font-medium text-on-surface-variant">
              Showing {rows.length} of {institutions.length} entries
            </p>
          )}
        </div>
      </section>

      {/* System audit log */}
      {overview && overview.auditLog.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-[13px] font-bold">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">history</span>
            System Audit Log
          </h3>
          <div className={`${CARD} divide-y divide-outline-variant overflow-hidden`}>
            {overview.auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-container">
                <div className="flex items-center gap-4">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      entry.tone === 'success' ? 'bg-emerald-500' : entry.tone === 'warning' ? 'bg-amber-500' : 'bg-secondary'
                    }`}
                  />
                  <div>
                    <p className="text-[11px] font-bold">{entry.title}</p>
                    <p className="text-[10px] text-on-surface-variant">{entry.detail}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider">{entry.actor}</p>
                  <p className="text-[9px] text-on-surface-variant">{entry.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <InstitutionDrawer
          institution={selected}
          busy={saving}
          onClose={() => setSelectedId(null)}
          onEdit={() => setForm({ id: selected.id })}
          onStatusChange={handleStatus}
        />
      )}

      {form && (
        <InstitutionFormModal
          institution={editing}
          saving={saving}
          error={actionError}
          onClose={() => {
            dismissError()
            setForm(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
