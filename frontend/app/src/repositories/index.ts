/**
 * Active repository binding — THE swap point.
 *
 * Today it resolves to mock repositories. To connect the backend, implement an
 * `api/` sibling satisfying the same `Repositories` interface and change this one
 * line. Nothing else in the app (services, hooks, pages, components) changes.
 */
import type { Repositories } from '@/repositories/types'
import { mockRepositories } from '@/repositories/mock'

export const repositories: Repositories = mockRepositories
