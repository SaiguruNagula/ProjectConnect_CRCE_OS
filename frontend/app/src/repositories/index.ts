/**
 * Active repository binding — THE swap point.
 *
 * The mocks are the base layer and the live `api/` implementations are laid over
 * them, so a repository is live exactly when it appears in `apiRepositories`.
 * Every later phase changes only that map; nothing else in the app (services,
 * hooks, pages, components) changes, and the mocks stay usable for development.
 */
import type { Repositories } from '@/repositories/types'
import { mockRepositories } from '@/repositories/mock'
import { apiRepositories } from '@/repositories/api'

export const repositories: Repositories = { ...mockRepositories, ...apiRepositories }
