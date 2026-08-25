/**
 * Admin Institutions state — loads the institution directory and its summary
 * panels, owns the search/filter logic, and persists governance actions through
 * adminService. The page renders; it never talks to a service or repository
 * directly (Component → Hook → Service → Repository → API).
 *
 * Since Phase 14 the directory is one row — the caller's own institution, which
 * is the only one this deployment has (ADR-9) — and of the three actions only
 * edit reaches a backend. Create and status change reject in the repository, and
 * `run` puts the message they throw into `actionError` for the page's banner.
 * The filters stay: they are the frozen page's, and a one-row list is a case
 * they already handle.
 */
import { useCallback, useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/catalog.service'
import type {
  AdminInstitution,
  InstitutionInput,
  InstitutionStatus,
  InstitutionsOverview,
} from '@/types/domain'

export interface InstitutionFilters {
  query: string
  /** Empty string means "all" for each facet. */
  type: string
  state: string
  status: string
}

const NO_FILTERS: InstitutionFilters = { query: '', type: '', state: '', status: '' }

const unique = (values: string[]) => Array.from(new Set(values)).sort()

function matches(institution: AdminInstitution, filters: InstitutionFilters): boolean {
  const q = filters.query.trim().toLowerCase()
  const haystack = [
    institution.name,
    institution.fullName,
    institution.code,
    institution.principal?.name ?? '',
  ]
  return (
    (!filters.type || institution.type === filters.type) &&
    (!filters.state || institution.state === filters.state) &&
    (!filters.status || institution.status === filters.status) &&
    (!q || haystack.some((field) => field.toLowerCase().includes(q)))
  )
}

export function useInstitutions() {
  const directory = useAsync<AdminInstitution[]>(() => adminService.institutionDirectory())
  const overview = useAsync<InstitutionsOverview>(() => adminService.institutionsOverview())
  const [filters, setFilters] = useState<InstitutionFilters>(NO_FILTERS)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const institutions = useMemo(() => directory.data ?? [], [directory.data])

  /** Facet options are derived from the data, never hardcoded in the UI. */
  const options = useMemo(
    () => ({
      types: unique(institutions.map((i) => i.type)),
      states: unique(institutions.map((i) => i.state)),
      statuses: unique(institutions.map((i) => i.status)),
    }),
    [institutions],
  )

  const rows = useMemo(
    () => institutions.filter((institution) => matches(institution, filters)),
    [institutions, filters],
  )

  const setFilter = useCallback(
    (key: keyof InstitutionFilters, value: string) =>
      setFilters((current) => ({ ...current, [key]: value })),
    [],
  )

  const clearFilters = useCallback(() => setFilters(NO_FILTERS), [])

  const reload = directory.reload

  const run = useCallback(
    async (action: () => Promise<AdminInstitution>, message: string, fallbackError: string) => {
      setSaving(true)
      setActionError(null)
      try {
        await action()
        setSavedMessage(message)
        reload()
        return true
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallbackError)
        return false
      } finally {
        setSaving(false)
      }
    },
    [reload],
  )

  const save = useCallback(
    (input: InstitutionInput, id?: string) =>
      run(
        () => adminService.saveInstitution(input, id),
        id ? `${input.name} updated.` : `${input.name} registered.`,
        'Could not save the institution. Please try again.',
      ),
    [run],
  )

  const setStatus = useCallback(
    (id: string, status: InstitutionStatus) =>
      run(
        () => adminService.setInstitutionStatus(id, status),
        `Institution marked ${status}.`,
        'Could not update the institution status. Please try again.',
      ),
    [run],
  )

  return {
    institutions,
    rows,
    options,
    filters,
    setFilter,
    clearFilters,
    loading: directory.loading,
    error: directory.error,
    reload,
    overview: overview.data,
    saving,
    actionError,
    savedMessage,
    dismissSaved: () => setSavedMessage(null),
    dismissError: () => setActionError(null),
    save,
    setStatus,
  }
}
