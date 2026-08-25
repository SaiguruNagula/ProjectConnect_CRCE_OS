/**
 * Student profile repository — live (Phase 7).
 *
 * The editing surface for a student's identity, and the only one: the portfolio
 * reads these fields, never writes them.
 *
 * There is no path that takes a user id. `me` is the token, so `get(userId)`
 * ignores its argument rather than letting a caller ask for someone else's
 * profile and be quietly answered with their own.
 */
import { apiClient } from '@/api/client'
import { camelize, decamelize } from '@/api/case'
import type { ProfileRepository } from '@/repositories/types'
import type { StudentProfile } from '@/types/domain'

const PATH = '/students/me/profile'

/** The prose fields are nullable columns; every other field is set on read. */
type ProfileBody = Omit<StudentProfile, 'headline' | 'tagline' | 'bio' | 'department'> &
  Record<'headline' | 'tagline' | 'bio' | 'department', string | null>

/** Fields the profile has not been filled in with yet. Null reads as blank. */
function normalize(body: ProfileBody): StudentProfile {
  return {
    ...body,
    headline: body.headline ?? '',
    tagline: body.tagline ?? '',
    bio: body.bio ?? '',
    department: body.department ?? '',
  }
}

export const profileApiRepository: ProfileRepository = {
  get: async () => normalize(camelize<ProfileBody>((await apiClient.get<unknown>(PATH)).data)),
  update: async (patch: Partial<StudentProfile>) => {
    const { data } = await apiClient.patch<unknown>(PATH, {
      ...(decamelize(patch) as Record<string, unknown>),
      // A handle is validated against a pattern, so a cleared field has to be
      // sent as null — "" is not an empty handle, it is an invalid one.
      ...(patch.github === '' ? { github: null } : {}),
      ...(patch.linkedin === '' ? { linkedin: null } : {}),
    })
    return normalize(camelize<ProfileBody>(data))
  },
}
