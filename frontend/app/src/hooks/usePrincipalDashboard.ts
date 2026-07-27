/**
 * Principal Dashboard state — the shared institution analytics aggregate plus
 * the top of each leaderboard, behind one loading/error surface.
 *
 * Rankings and credits are read from the Leaderboard, which stays their single
 * source of truth; the analytics aggregate is read through
 * useInstitutionAnalytics, the same hook Institution Analytics uses. Nothing is
 * recalculated here.
 */
import { useMemo } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useInstitutionAnalytics } from '@/hooks/useInstitutionAnalytics'
import { leaderboardService } from '@/services/catalog.service'
import type { LeaderboardEntry } from '@/types/domain'

/** Rows shown in each embedded leaderboard panel (Stitch shows three). */
const TOP_N = 3

export function usePrincipalDashboard() {
  const { analytics, loading, error, reload } = useInstitutionAnalytics()
  const students = useAsync<LeaderboardEntry[]>(() => leaderboardService.students())
  const faculty = useAsync<LeaderboardEntry[]>(() => leaderboardService.faculty())

  const topStudents = useMemo(() => (students.data ?? []).slice(0, TOP_N), [students.data])
  const topFaculty = useMemo(() => (faculty.data ?? []).slice(0, TOP_N), [faculty.data])

  return {
    analytics,
    topStudents,
    topFaculty,
    loading: loading || students.loading || faculty.loading,
    error: error ?? students.error ?? faculty.error,
    reload,
  }
}
