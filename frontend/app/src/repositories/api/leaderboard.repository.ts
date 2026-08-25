/**
 * Leaderboard repository — live (Phase 7).
 *
 * Both boards are already ranked, badged and ordered by the backend, which
 * reads the Credit Engine ledger. Nothing is sorted or scored here.
 */
import { apiClient } from '@/api/client'
import { camelize } from '@/api/case'
import type { LeaderboardRepository } from '@/repositories/types'
import type { LeaderboardEntry } from '@/types/domain'

/** `department` is null until its owner sets one on their profile. */
type Entry = Omit<LeaderboardEntry, 'department'> & { department: string | null }

async function board(path: string): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get<unknown>(`/leaderboard/${path}`)
  return camelize<Entry[]>(data).map((e) => ({ ...e, department: e.department ?? '' }))
}

export const leaderboardApiRepository: LeaderboardRepository = {
  students: () => board('students'),
  faculty: () => board('faculty'),
}
