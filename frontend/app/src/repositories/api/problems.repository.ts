/**
 * Problem catalog repository — live (Phase 7).
 *
 * Every method here is one documented endpoint. The read models are the same
 * shapes types/domain.ts already declares, in the backend's casing, so the
 * bodies go through `camelize`/`decamelize` rather than a field mapper.
 *
 * Search, filtering, sorting and paging are query parameters, not client-side
 * work: the catalog page is served whole by GET /problems.
 */
import { ApiError, apiClient } from '@/api/client'
import { camelize, decamelize } from '@/api/case'
import type { ProblemRepository } from '@/repositories/types'
import type {
  CreateProblemInput,
  MentorOption,
  Problem,
  ProblemCatalogPage,
  ProblemDraft,
  ProblemQuery,
  ProblemSuggestion,
  ProblemSuggestionInput,
  SuggestionDecisionInput,
} from '@/types/domain'

/** The backend's hard ceiling (common/pagination.py), so `list()` asks once. */
const MAX_LIMIT = 100

/** One problem, or null when it is not there / not ours to see. */
async function find(id: string): Promise<Problem | null> {
  try {
    return await fetchProblem(id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** One problem, for callers that just changed it and expect it to exist. */
export async function fetchProblem(id: string): Promise<Problem> {
  const { data } = await apiClient.get<unknown>(`/problems/${id}`)
  return camelize<Problem>(data)
}

async function page(query: ProblemQuery): Promise<ProblemCatalogPage> {
  const { data } = await apiClient.get<unknown>('/problems', {
    page: query.page,
    limit: query.limit,
    search: query.search,
    department: query.department,
    saved_only: query.savedOnly,
    sort: query.sort,
  })
  return camelize<ProblemCatalogPage>(data)
}

async function saveSuggestion(
  input: ProblemSuggestionInput,
  submit: boolean,
  id?: string,
): Promise<ProblemSuggestion> {
  const body = decamelize(input)
  // Same payload either way; the id is what distinguishes a first draft from a
  // replacement, exactly as the two routes are split server-side.
  const { data } = id
    ? await apiClient.put<unknown>(`/problem-suggestions/${id}`, body, { submit })
    : await apiClient.post<unknown>('/problem-suggestions', body, { submit })
  return camelize<ProblemSuggestion>(data)
}

export const problemsApiRepository: ProblemRepository = {
  list: async () => (await page({ page: 1, limit: MAX_LIMIT })).items,
  page,
  get: find,
  create: async (input: CreateProblemInput) => {
    const { data } = await apiClient.post<unknown>('/problems', decamelize(input))
    return camelize<Problem>(data)
  },
  saveDraft: async (input: CreateProblemInput) => {
    await apiClient.post('/problems/drafts', decamelize(input))
  },
  drafts: async () => {
    const { data } = await apiClient.get<unknown>('/problems/drafts')
    return camelize<ProblemDraft[]>(data)
  },
  setBookmark: async (id: string, bookmarked: boolean) => {
    const path = `/problems/${id}/bookmark`
    const { data } = bookmarked
      ? await apiClient.put<unknown>(path)
      : await apiClient.delete<unknown>(path)
    return camelize<Problem>(data)
  },
  mentors: async () => camelize<MentorOption[]>((await apiClient.get<unknown>('/mentors')).data),
  suggestions: async () =>
    camelize<ProblemSuggestion[]>((await apiClient.get<unknown>('/problem-suggestions')).data),
  saveSuggestion,
  decideSuggestion: async (input: SuggestionDecisionInput) => {
    const { data } = await apiClient.post<unknown>(
      `/problem-suggestions/${input.suggestionId}/decision`,
      decamelize({ decision: input.decision, feedback: input.feedback }),
    )
    return camelize<ProblemSuggestion>(data)
  },
}
