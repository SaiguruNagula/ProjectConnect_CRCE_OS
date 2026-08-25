/**
 * Admin repository — partly live (Phases 10 and 14).
 *
 * Live: the user directory and its headcount (Phase 10, served by the users
 * module), the identity half of the audit log (Phase 12), and the institution
 * console's directory, its panels and its edit action (Phase 14). All of them
 * are scoped to the caller's own institution by the token; none takes an
 * institution id.
 *
 * Still on the mock: `dashboard` and `institutions`, the platform snapshot and
 * the per-department breakdown behind it. Spreading the mock first is what keeps
 * them working: repositories/index.ts lays this object over the mocks whole, not
 * method by method.
 *
 * ADR-9 is why the console is only half live. One college is one deployment is
 * one database is one institution, so there is no institution to create, no
 * second institution to list and no platform operator to suspend one — those
 * three actions reject with a message rather than pretending against the mock,
 * because the page they sit on is now showing real data.
 *
 * The KPI tiles are built here because labels, tones and bars are presentation.
 * Every number in them is a count the backend made; nothing is estimated, and a
 * panel with no canonical source (verification backlog, identity health, audit
 * history) is returned empty for the page to hide rather than filled with
 * plausible figures.
 */
import { apiClient } from '@/api/client'
import { camelize, decamelize } from '@/api/case'
import { identityPhrase, UNKNOWN_ACTOR } from '@/features/audit/phrases'
import { mockRepositories } from '@/repositories/mock'
import type { AdminRepository } from '@/repositories/types'
import type {
  AdminInstitution,
  DirectoryUser,
  InstitutionInput,
  InstitutionsOverview,
  UserAuditEntry,
  UserKpi,
  UsersOverview,
} from '@/types/domain'

/** The backend's hard ceiling (common/pagination.py), so the directory asks once. */
const MAX_LIMIT = 100

/** The counts GET /users/overview answers with — the whole institution, not a page. */
interface Headcount {
  total: number
  students: number
  faculty: number
  principals: number
  pending: number
  suspended: number
}

/** `department` is null until its owner sets one; the column shows a blank cell. */
type Row = Omit<DirectoryUser, 'department'> & { department: string | null }

function toKpis(counts: Headcount): UserKpi[] {
  const share = (part: number) => (counts.total ? Math.round((part / counts.total) * 100) : 0)
  const value = (count: number) => count.toLocaleString()
  return [
    { label: 'Total Users', value: value(counts.total), tone: 'neutral' },
    {
      label: 'Students',
      value: value(counts.students),
      tone: 'neutral',
      progress: share(counts.students),
    },
    {
      label: 'Faculty',
      value: value(counts.faculty),
      tone: 'neutral',
      progress: share(counts.faculty),
    },
    {
      label: 'Principals',
      value: value(counts.principals),
      tone: 'neutral',
      progress: share(counts.principals),
    },
    {
      label: 'Pending Verif.',
      value: value(counts.pending),
      tone: counts.pending > 0 ? 'critical' : 'positive',
      note: counts.pending > 0 ? 'Action required' : undefined,
      ring: counts.pending > 0,
    },
    {
      label: 'Suspended',
      value: value(counts.suspended),
      tone: counts.suspended > 0 ? 'critical' : 'positive',
    },
  ]
}

/**
 * The Institution Governance panel, for the one institution this deployment
 * serves. Same tile model as the Admin Users page, same rule: every value is a
 * count the backend made, and a tile with no canonical source is not drawn.
 */
function toInstitutionKpis(institution: AdminInstitution): UserKpi[] {
  const value = (count: number) => count.toLocaleString()
  return [
    {
      label: 'Status',
      value: institution.status,
      tone: institution.status === 'active' ? 'positive' : 'critical',
      // A suspended or pending institution cannot authenticate at all (ADR-9),
      // which is worth saying on the tile that reports it.
      note: institution.status === 'active' ? undefined : 'Sign-in disabled',
      ring: institution.status === 'suspended',
    },
    { label: 'Total Students', value: value(institution.students), tone: 'neutral' },
    { label: 'Total Faculty', value: value(institution.faculty), tone: 'neutral' },
    { label: 'Total Projects', value: value(institution.projects), tone: 'neutral' },
    { label: 'Credits Earned', value: value(institution.credits), tone: 'neutral' },
  ]
}

/** One row of GET /audit/users — the identity half of the audit log. */
interface AuditEntryBody {
  id: string
  action: string
  actor_name: string
  created_at: string
}

/**
 * The panel shows the clock time of the event, its actor and its outcome. It
 * shows no target: an identity event is about the account that acted, and the
 * account that acted is already the actor.
 */
function toAuditEntry(body: AuditEntryBody): UserAuditEntry {
  const phrase = identityPhrase(body.action)
  return {
    id: body.id,
    time: new Date(body.created_at).toLocaleTimeString('en-GB', { hour12: false }),
    actor: body.actor_name || UNKNOWN_ACTOR,
    message: phrase.message,
    target: '',
    result: phrase.result,
    ok: phrase.ok,
  }
}

/**
 * What GET /institutions answers with. `tier` and the optional address fields
 * are null until somebody fills them in; the console renders a blank cell.
 */
interface InstitutionBody extends Omit<AdminInstitution, 'tier' | 'website' | 'supportEmail' | 'address' | 'principal'> {
  tier: string | null
  website: string | null
  supportEmail: string | null
  address: string | null
  principal: AdminInstitution['principal'] | null
}

/** Nulls become the absent/empty values the frozen `AdminInstitution` expects. */
function toInstitution(body: InstitutionBody): AdminInstitution {
  return {
    ...body,
    tier: body.tier ?? '',
    website: body.website ?? undefined,
    supportEmail: body.supportEmail ?? undefined,
    address: body.address ?? undefined,
    principal: body.principal ?? undefined,
  }
}

/**
 * The three console actions ADR-9 leaves without a backend, and why. Thrown
 * rather than faked: useInstitutions surfaces the message in the page's existing
 * error banner, which is the honest outcome for a button whose data is now real.
 */
const NO_PROVISIONING =
  'This deployment serves one institution, so a new one cannot be registered from here. Institutions are provisioned at installation.'
const NO_STATUS_CONTROL =
  'Institution status is a platform operation and is not available from an institution console.'

export const adminApiRepository: AdminRepository = {
  ...mockRepositories.admin,

  institutionDirectory: async (): Promise<AdminInstitution[]> => {
    const { data } = await apiClient.get<unknown>('/institutions')
    return camelize<InstitutionBody[]>(data).map(toInstitution)
  },

  institutionsOverview: async (): Promise<InstitutionsOverview> => {
    const { data } = await apiClient.get<unknown>('/institutions')
    const [institution] = camelize<InstitutionBody[]>(data).map(toInstitution)
    return {
      // Dropped from the Stitch panel: "Total Institutions" and the
      // platform-wide student/faculty/project roll-ups. Counting institutions
      // needs institutions this deployment cannot see (ADR-9); the four figures
      // that remain are this institution's own, as the backend counted them.
      kpis: institution ? toInstitutionKpis(institution) : [],
      // No institution-governance log exists. `GET /audit/activity` records
      // academic actions, not principal transfers or verifications, and the
      // panel is hidden rather than filled with the wrong log.
      auditLog: [],
    }
  },

  saveInstitution: async (input: InstitutionInput, id?: string): Promise<AdminInstitution> => {
    // No id means "create", and creating a tenant is provisioning (ADR-9).
    if (!id) throw new Error(NO_PROVISIONING)
    // `/me`, never `/{id}`: the institution edited is the token's, and sending
    // an id would imply this console can address another one.
    const { data } = await apiClient.patch<unknown>('/institutions/me', decamelize(input))
    return toInstitution(camelize<InstitutionBody>(data))
  },

  setInstitutionStatus: async (): Promise<AdminInstitution> => {
    throw new Error(NO_STATUS_CONTROL)
  },

  users: async () => {
    // ponytail: one page at the backend's ceiling — the directory filters and
    // pages in the browser. Ask by query parameter when a pilot institution
    // passes 100 accounts.
    const { data } = await apiClient.get<unknown>('/users', { page: 1, limit: MAX_LIMIT })
    const { items } = camelize<{ items: Row[] }>(data)
    return items.map((row) => ({ ...row, department: row.department ?? '' }))
  },

  usersOverview: async (): Promise<UsersOverview> => {
    const [counts, audit] = await Promise.all([
      apiClient.get<unknown>('/users/overview'),
      apiClient.get<AuditEntryBody[]>('/audit/users'),
    ])
    return {
      kpis: toKpis(camelize<Headcount>(counts.data)),
      // No verification workflow and no uptime telemetry exist yet (Phases 15
      // and 16). Empty is the honest answer; the page hides those panels rather
      // than showing invented ones.
      verificationQueue: [],
      identityHealth: [],
      auditLog: audit.data.map(toAuditEntry),
    }
  },
}
