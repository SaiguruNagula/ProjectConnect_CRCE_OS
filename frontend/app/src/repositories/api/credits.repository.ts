/**
 * Credit repository — live (Phase 7).
 *
 * Six reads of the caller's own ledger, and no write: the Credit Engine is the
 * only thing that moves a balance, and it is moved from the review surface.
 * Nothing here adds, totals or re-labels a number.
 */
import { apiClient } from '@/api/client'
import { camelize } from '@/api/case'
import type { CreditRepository } from '@/repositories/types'
import type {
  CreditCategory,
  CreditPipelineItem,
  CreditRule,
  CreditSummary,
  CreditTransaction,
  NameValue,
} from '@/types/domain'

async function read<T>(path: string): Promise<T> {
  const { data } = await apiClient.get<unknown>(`/credits${path}`)
  return camelize<T>(data)
}

export const creditsApiRepository: CreditRepository = {
  history: () => read<CreditTransaction[]>('/history'),
  breakdown: () => read<NameValue[]>('/me'),
  rules: () => read<CreditRule[]>('/rules'),
  summary: () => read<CreditSummary>('/summary'),
  categories: () => read<CreditCategory[]>('/categories'),
  pipeline: () => read<CreditPipelineItem[]>('/pipeline'),
}
