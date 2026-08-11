/**
 * Review vocabulary per stage: what the queue is called, what the submitted
 * content is, and which decisions a faculty can take. Keeping it in one table
 * means the panel renders any stage without branching on stage names, and a new
 * stage is a row here rather than a new component.
 */
import type {
  ProjectJourney,
  ReviewDecision,
  ReviewLifecycleStatus,
  ReviewQueueId,
  ReviewableStage,
} from '@/types/domain'
import type { BadgeProps } from '@/components/ui/Badge'
import type { SummaryRow } from '@/features/submissions/StageSummary'
import { finalRows, ideaRows, pocRows } from '@/features/submissions/summaryRows'

/** Every lifecycle status in words and colour — see ReviewStatusBadge. */
export const LIFECYCLE_STATUS: Record<
  ReviewLifecycleStatus,
  { label: string; short: string; tone: BadgeProps['tone'] }
> = {
  idea_submitted: { label: 'Idea Submitted', short: 'Idea', tone: 'primary' },
  idea_approved: { label: 'Idea Approved', short: 'Idea OK', tone: 'success' },
  poc_submitted: { label: 'PoC Submitted', short: 'PoC', tone: 'primary' },
  poc_approved: { label: 'PoC Approved', short: 'PoC OK', tone: 'success' },
  selected_for_final: { label: 'Selected for Final Development', short: 'Selected', tone: 'success' },
  final_submitted: { label: 'Final Submitted', short: 'Final', tone: 'primary' },
  approved: { label: 'Approved', short: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', short: 'Rejected', tone: 'error' },
  changes_requested: { label: 'Changes Requested', short: 'Changes', tone: 'warning' },
  completed: { label: 'Completed', short: 'Completed', tone: 'success' },
}

export interface DecisionMeta {
  decision: ReviewDecision
  label: string
  icon: string
  tone: 'primary' | 'neutral' | 'error'
  /** Wording of the confirmation dialog this decision opens. */
  confirm: string
}

export interface StageReviewMeta {
  label: string
  /** Machine code shown on the queue card, in the Stitch mono style. */
  code: string
  icon: string
  /** The submitted content, in the order a reviewer reads it. */
  rows: (journey: ProjectJourney) => SummaryRow[]
  /** Affirmative action first — it is the primary button on the panel. */
  decisions: DecisionMeta[]
}

const CHANGES: DecisionMeta = {
  decision: 'changes_requested',
  label: 'Request Changes',
  icon: 'history_edu',
  tone: 'neutral',
  confirm: 'The team gets your feedback and can resubmit this stage.',
}

const REJECT: DecisionMeta = {
  decision: 'reject',
  label: 'Reject',
  icon: 'block',
  tone: 'error',
  confirm: 'This ends the submission. The team cannot resubmit this stage.',
}

export const STAGE_REVIEW: Record<ReviewableStage, StageReviewMeta> = {
  idea: {
    label: 'Idea',
    code: 'STAGE_1_IDEA',
    icon: 'lightbulb',
    rows: (journey) => ideaRows(journey.idea.data),
    decisions: [
      {
        decision: 'approve',
        label: 'Approve Idea',
        icon: 'check_circle',
        tone: 'primary',
        confirm: 'The team can start building a proof of concept.',
      },
      CHANGES,
      REJECT,
    ],
  },
  poc: {
    label: 'Proof of Concept',
    code: 'STAGE_2_POC',
    icon: 'science',
    rows: (journey) => pocRows(journey.poc.data),
    decisions: [
      {
        decision: 'approve',
        label: 'Approve PoC',
        icon: 'check_circle',
        tone: 'primary',
        confirm: 'The proof of concept is approved, but the team is not yet selected to build the final project.',
      },
      {
        decision: 'select',
        label: 'Select for Final Development',
        icon: 'workspace_premium',
        tone: 'primary',
        confirm: 'This approves the proof of concept and unlocks the Final Project stage for the team.',
      },
      CHANGES,
      REJECT,
    ],
  },
  final: {
    label: 'Final Project',
    code: 'STAGE_3_FINAL',
    icon: 'rocket_launch',
    rows: (journey) => finalRows(journey.final.data),
    decisions: [
      {
        decision: 'approve',
        label: 'Approve Final Project',
        icon: 'check_circle',
        tone: 'primary',
        confirm: 'You can then award credits and choose whether to publish the project.',
      },
      CHANGES,
      REJECT,
    ],
  },
}

/** The four review queues, in the order faculty work through them. */
export const REVIEW_QUEUES: { id: ReviewQueueId; label: string; icon: string }[] = [
  { id: 'idea', label: 'Idea Reviews', icon: 'lightbulb' },
  { id: 'poc', label: 'Proof of Concept Reviews', icon: 'science' },
  { id: 'final', label: 'Final Project Reviews', icon: 'rocket_launch' },
  { id: 'completed', label: 'Completed Reviews', icon: 'task_alt' },
]
