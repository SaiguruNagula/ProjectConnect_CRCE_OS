/**
 * Export column definitions for the institution analytics read model. Shared by
 * the Principal dashboard and the Institution Analytics reports drawer so both
 * produce the identical file.
 */
import type { DepartmentHealth } from '@/types/domain'

export const DEPARTMENT_COLUMNS: { header: string; value: (d: DepartmentHealth) => unknown }[] = [
  { header: 'Department', value: (d) => d.name },
  { header: 'Active Projects', value: (d) => d.activeProjects },
  { header: 'Credits', value: (d) => d.credits },
  { header: 'Success Rate %', value: (d) => d.successRate },
  { header: 'Completion Rate %', value: (d) => d.completionRate },
  { header: 'Pending Reviews', value: (d) => d.pendingReviews },
  { header: 'Health', value: (d) => (d.healthy ? 'Healthy' : 'Watch') },
]
