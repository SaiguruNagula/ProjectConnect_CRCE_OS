/**
 * Dashboard repository — live for students (Phase 6) and faculty (Phase 8).
 *
 * Each endpoint returns four numbers and nothing else: the backend owns the
 * values, this file owns their presentation (label, icon, formatting), which is
 * where that decision already lived.
 *
 * `activity` is the audit log read back (Phase 12) — the same rows the modules
 * have been writing since the foundation, phrased for the timeline.
 *
 * The two chart methods still read the mock. Each names the phase that will
 * give it a backend; delegating is what keeps the pages that use them working
 * today without this file pretending the data is real.
 */
import { apiClient } from '@/api/client'
import { activityPhrase, UNKNOWN_ACTOR } from '@/features/audit/phrases'
import { mockRepositories } from '@/repositories/mock'
import type { DashboardRepository } from '@/repositories/types'
import type { Role } from '@/types'
import type { Activity, DashboardStats } from '@/types/domain'

/** The response body of GET /dashboard/student. */
interface StudentDashboardBody {
  total_credits: number
  rank: number | null
  active_projects: number
  pending_tasks: number
}

/** The response body of GET /dashboard/faculty. */
interface FacultyDashboardBody {
  projects_mentored: number
  students_guided: number
  credits_awarded: number
  solutions_published: number
}

/** One row of GET /audit/activity. */
interface AuditEntryBody {
  id: string
  action: string
  entity: string | null
  entity_id: string | null
  actor_name: string
  created_at: string
}

/**
 * The audit log records what was done and to which id, never the title of the
 * thing — `meta` is identifiers and outcomes only, by design. So the feed names
 * the kind of thing ("a project") rather than inventing a name for it.
 */
function toActivity(body: AuditEntryBody): Activity {
  const phrase = activityPhrase(body.action, body.entity)
  return {
    id: body.id,
    actor: body.actor_name || UNKNOWN_ACTOR,
    action: phrase.action,
    target: phrase.target,
    timestamp: body.created_at,
  }
}

/** No `delta` on any card: the backend has no trend, so no card claims one. */
function toStats(body: StudentDashboardBody): DashboardStats[] {
  return [
    {
      label: 'Total Credits',
      value: body.total_credits.toLocaleString('en-US'),
      icon: 'trending_up',
    },
    // An unranked student has no rank — an em dash says so, `#0` would not.
    { label: 'Leaderboard', value: body.rank === null ? '—' : `#${body.rank}`, icon: 'leaderboard' },
    { label: 'Active Projects', value: String(body.active_projects), icon: 'folder' },
    { label: 'Pending Tasks', value: String(body.pending_tasks), icon: 'checklist' },
  ]
}

/** The same four impact cards the rail has always shown, now counted. */
function toFacultyStats(body: FacultyDashboardBody): DashboardStats[] {
  return [
    { label: 'Projects Mentored', value: String(body.projects_mentored), icon: 'hub' },
    { label: 'Students Guided', value: String(body.students_guided), icon: 'groups' },
    { label: 'Credits Awarded', value: body.credits_awarded.toLocaleString('en-US'), icon: 'token' },
    { label: 'Solutions Approved', value: String(body.solutions_published), icon: 'verified' },
  ]
}

export const dashboardApiRepository: DashboardRepository = {
  stats: async (role: Role) => {
    if (role === 'student') {
      const { data } = await apiClient.get<StudentDashboardBody>('/dashboard/student')
      return toStats(data)
    }
    if (role === 'faculty') {
      const { data } = await apiClient.get<FacultyDashboardBody>('/dashboard/faculty')
      return toFacultyStats(data)
    }
    // Admin and leadership dashboards have no backend yet.
    return mockRepositories.dashboard.stats(role)
  },
  // Staff only, and the backend says so: a student's token gets 403 here, which
  // the only page that reads this (the faculty dashboard) never sends.
  activity: async () => {
    const { data } = await apiClient.get<AuditEntryBody[]>('/audit/activity')
    return data.map(toActivity)
  },
  // Nothing in the backend records a due date, so there is nothing to fetch and
  // nothing to invent: the rail that reads this degrades to its empty state.
  deadlines: () => Promise.resolve([]),
  creditTrend: () => mockRepositories.dashboard.creditTrend(), // phase 11 — analytics
  departmentDistribution: () => mockRepositories.dashboard.departmentDistribution(), // phase 11
}
