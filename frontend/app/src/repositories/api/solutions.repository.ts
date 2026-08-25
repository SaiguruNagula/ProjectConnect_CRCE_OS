/**
 * Solutions Hub repository — live (Phase 7).
 *
 * Read-only, and deliberately so: a project reaches the hub through the
 * mentor's `POST /projects/{id}/publication`, never from this surface. A
 * student consumes published solutions; nothing here can publish one.
 *
 * The backend serves what it can verify about a published project. The card
 * also carries presentation fields — icon, the meta pair, the CTA label — which
 * have never had a backend owner, so they are composed here, from data that
 * exists, rather than requested from an endpoint that would have to invent
 * them. `status` and `featured` are not composed: a deployment state and an
 * editorial pick are claims, and nothing on the platform makes either one.
 */
import { apiClient } from '@/api/client'
import { camelize } from '@/api/case'
import type { SolutionRepository } from '@/repositories/types'
import type { Solution, SolutionStats } from '@/types/domain'

/** GET /solutions — domain.ts `Solution` minus the presentation fields below. */
type SolutionBody = Omit<Solution, 'icon' | 'status' | 'metaLabel' | 'metaValue' | 'ctaLabel' | 'featured'> & {
  credits: number | null
}

interface StatsBody {
  liveSolutions: number
  contributors: number
  departments: number
}

function toSolution(body: SolutionBody): Solution {
  return {
    ...body,
    icon: 'rocket_launch',
    // The Credit Engine's award for the project, or nothing while it is
    // published but unscored.
    metaLabel: 'Credits',
    metaValue: body.credits === null ? '—' : String(body.credits),
    // An external deployment opens where it lives; everything else opens the
    // work that produced it.
    ctaLabel: body.url ? 'Open' : 'View Project',
    featured: false,
  }
}

export const solutionsApiRepository: SolutionRepository = {
  list: async () => {
    const { data } = await apiClient.get<unknown>('/solutions')
    return camelize<SolutionBody[]>(data).map(toSolution)
  },
  stats: async () => {
    const { data } = await apiClient.get<unknown>('/solutions/stats')
    const body = camelize<StatsBody>(data)
    // `campusUsers` stays absent: CRCE OS does not instrument the deployments
    // it links to, and the hero renders an em dash for what it is not told.
    return {
      liveSolutions: body.liveSolutions,
      contributors: String(body.contributors),
      departments: body.departments,
    } satisfies SolutionStats
  },
}
