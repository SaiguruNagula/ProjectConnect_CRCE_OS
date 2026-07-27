/**
 * Institution analytics state — the single entry point both principal views use
 * to read institutional performance (Component → Hook → Service → Repository →
 * API). The Principal Dashboard composes this hook through usePrincipalDashboard;
 * Institution Analytics consumes it directly. Neither page talks to a service or
 * repository, and neither recomputes anything the aggregate already provides.
 */
import { useAsync } from '@/hooks/useAsync'
import { analyticsService } from '@/services/catalog.service'
import type { InstitutionAnalytics } from '@/types/domain'

export function useInstitutionAnalytics() {
  const { data, loading, error, reload } = useAsync<InstitutionAnalytics>(() =>
    analyticsService.institution(),
  )
  return { analytics: data, loading, error, reload }
}
