/**
 * Display vocabulary for a student-suggested problem, shared by the student's
 * suggestion list and the mentor's review panel so both name a state the same.
 */
import type { ProblemSuggestionStatus } from '@/types/domain'
import type { BadgeProps } from '@/components/ui/Badge'

export const SUGGESTION_STATUS: Record<
  ProblemSuggestionStatus,
  { label: string; tone: BadgeProps['tone'] }
> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_mentor_review: { label: 'Pending Mentor Review', tone: 'warning' },
  changes_requested: { label: 'Changes Requested', tone: 'error' },
  approved: { label: 'Approved', tone: 'success' },
  published: { label: 'Published', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
}

/** A student can only edit a suggestion the mentor has handed back. */
export function isSuggestionEditable(status: ProblemSuggestionStatus): boolean {
  return status === 'draft' || status === 'changes_requested'
}
