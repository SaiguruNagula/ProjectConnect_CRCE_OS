/**
 * Analytics repository — the institution, as the backend counts it (Phases 11, 13).
 *
 * `institution()` is live against GET /api/v1/dashboard/principal, the same
 * aggregation layer the student and faculty dashboards read. `campusImpact()`
 * went live in Phase 14 against the public GET /api/v1/analytics/campus-impact.
 * Both methods of this repository are now live; the mock is still spread first
 * because repositories/index.ts lays this object over it whole rather than
 * method by method, and the spread is what makes that safe to keep doing.
 *
 * Phase 13 added the department breakdown, six months of throughput and the
 * review turnaround to that one response. They arrive as counts; every ratio,
 * percentage, tone and short month label below is computed here, because they
 * are presentation decisions about the backend's numbers rather than facts of
 * their own — the same split admin.repository.ts already draws.
 *
 * Still empty, still for want of a canonical owner: the innovation health
 * index (no rubric exists), governance approvals and decisions (no domain),
 * publications, patents and industry collaborations (no domain), the
 * inter-institution rank (ADR-9 gives a deployment one institution, so there is
 * nothing to rank it against — this one is permanent, not deferred) and the
 * department radar,
 * four of whose five drawn axes measure nothing the platform records. The
 * pages hide each of those sections rather than draw an empty frame. Nothing
 * below is estimated, interpolated or carried over from the mock except the
 * report menu labels, which are export configuration rather than institution
 * data.
 */
import { apiClient } from '@/api/client'
import { camelize } from '@/api/case'
import { INSTITUTION_ANALYTICS } from '@/mocks/principal-dashboard'
import { mockRepositories } from '@/repositories/mock'
import type { AnalyticsRepository } from '@/repositories/types'
import type {
  AnalyticsHighlight,
  DepartmentHealth,
  GrowthPoint,
  InstitutionAnalytics,
  NameValue,
} from '@/types/domain'

/** What GET /dashboard/principal answers with — counts, and the tenant's name. */
interface Counters {
  institutionName: string
  students: number
  faculty: number
  activeProjects: number
  completedProjects: number
  openProblems: number
  activeTeams: number
  totalCredits: number
  departments: DepartmentStats[]
  growth: MonthPoint[]
  avgReviewDays: number | null
}

interface DepartmentStats {
  name: string
  activeProjects: number
  completedProjects: number
  pendingReviews: number
  decidedReviews: number
  approvedReviews: number
  credits: number
}

interface MonthPoint {
  /** 'YYYY-MM'. */
  month: string
  credits: number
  projects: number
}

/**
 * Where the department table stops calling a column good news. Display
 * thresholds, not platform policy: the backend ships the counts and takes no
 * view on them, and moving these two numbers changes a dot and a text colour.
 */
const HEALTHY_SUCCESS_RATE = 60
const CRITICAL_BACKLOG = 10

const count = (value: number) => value.toLocaleString()

/** Credits run to seven figures on the tile that shows them. */
const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)

/** A share of a whole, rounded, and zero when there is no whole to divide by. */
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

/**
 * The department table. Four of its columns are ratios of counts the backend
 * sent — success is the share of decided stages that were approved, completion
 * the share of the department's projects that are finished — so both are zero
 * for a department nothing has happened in yet, which is what the table shows.
 */
function toDepartments(departments: DepartmentStats[]): DepartmentHealth[] {
  return departments.map((department) => {
    const successRate = percent(department.approvedReviews, department.decidedReviews)
    return {
      // The name is the id: `problems.department` is a string, unique per
      // institution by construction, and there is no department table to key on.
      id: department.name,
      name: department.name,
      activeProjects: department.activeProjects,
      credits: compact(department.credits),
      successRate,
      completionRate: percent(
        department.completedProjects,
        department.activeProjects + department.completedProjects,
      ),
      // A department nobody has reviewed yet is not in trouble; it is quiet.
      healthy: department.decidedReviews === 0 || successRate >= HEALTHY_SUCCESS_RATE,
      pendingReviews: department.pendingReviews,
      pendingReviewsCritical: department.pendingReviews >= CRITICAL_BACKLOG,
    }
  })
}

/** 'YYYY-MM' as the chart's three-letter label, read in UTC as the backend cut it. */
function monthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return new Date(Date.UTC(year, index - 1, 1)).toLocaleString(undefined, {
    month: 'short',
    timeZone: 'UTC',
  })
}

const toGrowth = (growth: MonthPoint[]): GrowthPoint[] =>
  growth.map((point) => ({ ...point, month: monthLabel(point.month) }))

/**
 * The figures under the growth chart. Each one is a comparison between two real
 * months or a mean the backend computed; a month with no month before it says
 * so rather than reporting growth against zero.
 */
function toHighlights(counters: Counters): AnalyticsHighlight[] {
  const highlights: AnalyticsHighlight[] = []
  const latest = counters.growth[counters.growth.length - 1]
  const previous = counters.growth[counters.growth.length - 2]

  if (latest) {
    const change = previous?.credits ? percent(latest.credits - previous.credits, previous.credits) : null
    highlights.push({
      label: 'Credits This Month',
      value: compact(latest.credits),
      note: change === null ? 'no prior month to compare' : `${change >= 0 ? '+' : ''}${change}% vs last month`,
      noteTone: change === null ? 'muted' : change >= 0 ? 'positive' : 'critical',
    })
    highlights.push({
      label: 'New Projects',
      value: count(latest.projects),
      note: 'started this month',
      noteTone: 'muted',
    })
  }

  if (counters.avgReviewDays !== null) {
    highlights.push({
      label: 'Avg. Review Time',
      value: `${counters.avgReviewDays.toFixed(1)} days`,
      note: 'submission to verdict',
      noteTone: counters.avgReviewDays <= 7 ? 'positive' : 'muted',
    })
  }

  return highlights
}

/**
 * Tile ids, labels and icons are the approved design's; only the values are the
 * backend's. Tiles whose figure has no canonical source are absent rather than
 * present and blank — a snapshot grid renders what it is given.
 */
function toTiles(counters: Counters): Pick<
  InstitutionAnalytics,
  'summary' | 'snapshot' | 'innovation'
> {
  return {
    summary: [
      { id: 'summary-students', label: 'Total Students', value: count(counters.students), icon: 'groups' },
      { id: 'summary-faculty', label: 'Faculty', value: count(counters.faculty), icon: 'badge' },
      {
        id: 'summary-projects-solved',
        label: 'Projects Solved',
        value: count(counters.completedProjects),
        icon: 'task_alt',
      },
      // Dropped: Patents Filed. No patents domain exists (§31, a post-1.0 module).
    ],
    snapshot: [
      { id: 'students', label: 'Total Students', value: count(counters.students) },
      { id: 'faculty', label: 'Total Faculty', value: count(counters.faculty) },
      // 'LIVE' labels what the tile counts; it is not a trend figure.
      {
        id: 'projects',
        label: 'Live Projects',
        value: count(counters.activeProjects),
        badge: 'LIVE',
        badgeTone: 'brand',
      },
      { id: 'problems', label: 'Open Problems', value: count(counters.openProblems) },
      {
        id: 'credits',
        label: 'Credits Earned',
        value: compact(counters.totalCredits),
        monoNote: true,
      },
      // Dropped: Inst. Rank. Ranking one institution against others needs other
      // institutions, and ADR-9 puts each one in its own deployment and its own
      // database. Phase 14 confirmed this rather than lifting it.
    ],
    // Problems Solved has no writer for a closed status, and publications,
    // collaborations and patents have no domain at all. New Projects is the
    // current month off the growth series, and is absent with it.
    innovation: [
      { id: 'active-teams', label: 'Active Teams', value: count(counters.activeTeams) },
      ...(counters.growth.length > 0
        ? [
            {
              id: 'new-projects',
              label: 'New Projects',
              value: count(counters.growth[counters.growth.length - 1].projects),
            },
          ]
        : []),
    ],
  }
}

export const analyticsApiRepository: AnalyticsRepository = {
  ...mockRepositories.analytics,

  /**
   * The public headline bar (Landing, About, Innovation Hub) — Phase 14.
   *
   * The one call in this app that runs before anybody has signed in, and the
   * backend answers it with four labelled integers and nothing else. Passed
   * through unchanged: `label` and `value` are already the frozen `NameValue`,
   * and the figures are the backend's to decide. An empty list means no active
   * institution has anything to report, and every consumer hides its bar.
   */
  campusImpact: async (): Promise<NameValue[]> => {
    const { data } = await apiClient.get<NameValue[]>('/analytics/campus-impact')
    return data
  },

  institution: async (): Promise<InstitutionAnalytics> => {
    const { data } = await apiClient.get<unknown>('/dashboard/principal')
    const counters = camelize<Counters>(data)

    return {
      institutionName: counters.institutionName,
      // No academic year is stored anywhere, so the caption says what the view
      // is rather than which year it covers.
      period: 'Executive Overview',
      ...toTiles(counters),
      departments: toDepartments(counters.departments),
      growth: toGrowth(counters.growth),
      highlights: toHighlights(counters),
      reportCategories: INSTITUTION_ANALYTICS.reportCategories,
      // Everything below needs a rubric, a governance workflow or a second
      // tenant, none of which the platform has. The pages hide each section
      // rather than draw an empty frame.
      health: { status: '', change: '', caption: '' },
      approvals: [],
      newApprovalsCount: 0,
      decisions: [],
      decisionCount: 0,
      departmentRadar: [],
      departmentPerformance: [],
    }
  },
}
