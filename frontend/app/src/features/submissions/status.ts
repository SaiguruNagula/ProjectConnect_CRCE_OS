/**
 * Display vocabulary for the four-stage innovation lifecycle. Labels, icons and
 * badge tones live here so every surface — the workspace, My Projects, the
 * dashboard — names a stage and a status identically.
 */
import type { ProjectJourney, StageStatus, SubmissionStage } from '@/types/domain'
import type { BadgeProps } from '@/components/ui/Badge'

export interface StageMeta {
  value: SubmissionStage
  label: string
  /** One line explaining what the student does in this stage. */
  blurb: string
  icon: string
}

/** The lifecycle, in order. Index doubles as the step number. */
export const STAGES: StageMeta[] = [
  {
    value: 'idea',
    label: 'Idea',
    blurb: 'Describe what you want to build and how you will approach it.',
    icon: 'lightbulb',
  },
  {
    value: 'poc',
    label: 'Proof of Concept',
    blurb: 'Show a working prototype — code, demo and evidence it runs.',
    icon: 'science',
  },
  {
    value: 'selection',
    label: 'Faculty Selection',
    blurb: 'Faculty review the proposals and select which teams build the final project.',
    icon: 'how_to_reg',
  },
  {
    value: 'final',
    label: 'Final Project',
    blurb: 'Submit the finished project — repository, live link, report and demo.',
    icon: 'rocket_launch',
  },
]

export function stageMeta(stage: SubmissionStage): StageMeta {
  // STAGES covers the union exhaustively; the fallback only satisfies the type.
  return STAGES.find((s) => s.value === stage) ?? STAGES[0]
}

/** The five scored evaluation categories, in the order faculty fill them in. */
export const EVALUATION_SCORES = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'technicalQuality', label: 'Technical Quality' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'presentation', label: 'Presentation' },
] as const

interface StatusMeta {
  label: string
  /** Compact label for list rows, where the full wording does not fit. */
  short: string
  tone: BadgeProps['tone']
}

export const STAGE_STATUS: Record<StageStatus, StatusMeta> = {
  draft: { label: 'Draft', short: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', short: 'Submitted', tone: 'primary' },
  under_review: { label: 'Under Review', short: 'Under review', tone: 'warning' },
  changes_requested: { label: 'Changes Requested', short: 'Changes requested', tone: 'error' },
  approved: { label: 'Approved', short: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', short: 'Rejected', tone: 'error' },
  not_reviewed: { label: 'Not Yet Reviewed', short: 'Awaiting review', tone: 'neutral' },
  selected: { label: 'Selected for Final Development', short: 'Selected', tone: 'success' },
  not_selected: { label: 'Not Selected', short: 'Not selected', tone: 'error' },
}

/** The status of any one stage, without the caller branching on stage names. */
export function statusOf(journey: ProjectJourney, stage: SubmissionStage): StageStatus {
  return stage === 'selection' ? journey.selection.status : journey[stage].status
}

/** Whether the student can still edit a stage they have authored. */
export function isEditable(status: StageStatus): boolean {
  return status === 'draft' || status === 'changes_requested'
}

/** 1-based step number, for "Stage 2 of 4" style labels. */
export function stageNumber(stage: SubmissionStage): number {
  return STAGES.findIndex((s) => s.value === stage) + 1
}

/** The one thing the team should do next, in a single line. */
export function nextAction(stage: SubmissionStage, status: StageStatus): string {
  const label = stageMeta(stage).label.toLowerCase()
  switch (status) {
    case 'draft':
      return `Finish and submit your ${label}`
    case 'changes_requested':
      return `Update your ${label} and resubmit`
    case 'submitted':
    case 'under_review':
    case 'not_reviewed':
      return 'Awaiting faculty review'
    case 'selected':
      return 'Build and submit your final project'
    case 'not_selected':
      return 'Not selected — explore other open problems'
    case 'rejected':
      return `Your ${label} was rejected — explore other open problems`
    case 'approved':
      return stage === 'final' ? 'Complete — credits awarded' : 'Approved — continue to the next stage'
  }
}
