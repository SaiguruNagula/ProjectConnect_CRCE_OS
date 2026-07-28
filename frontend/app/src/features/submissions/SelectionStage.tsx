/**
 * Stage 3 — Faculty Selection. Nothing for the student to fill in: this is the
 * decision, who made it and why, plus what happens next. Only selected teams
 * continue to Stage 4.
 */
import type { ProjectJourney, SelectionStatus, SubmissionStage } from '@/types/domain'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { fmtDate } from '@/utils/date'
import { STAGE_STATUS } from './status'
import { FeedbackNote } from './fields'

/** What the decision means for the team, in the student's own terms. */
const OUTCOME: Record<SelectionStatus, { icon: string; message: string }> = {
  not_reviewed: {
    icon: 'hourglass_top',
    message:
      'Your proposal is with faculty. You will be notified here once a decision is made — nothing is needed from you right now.',
  },
  changes_requested: {
    icon: 'edit_note',
    message:
      'Faculty asked for changes before they can decide. Update your proof of concept and submit it again.',
  },
  selected: {
    icon: 'workspace_premium',
    message:
      'Your team has been selected for final development. Stage 4 is unlocked — build the project and submit it there.',
  },
  not_selected: {
    icon: 'info',
    message:
      'Another proposal was selected for this problem. Your idea and proof of concept stay on your portfolio, and you can apply to any other open problem.',
  },
}

interface SelectionStageProps {
  journey: ProjectJourney
  onOpenStage: (stage: SubmissionStage) => void
}

export function SelectionStage({ journey, onOpenStage }: SelectionStageProps) {
  const { status, feedback, decidedBy, decidedAt } = journey.selection
  const meta = STAGE_STATUS[status]
  const outcome = OUTCOME[status]

  return (
    <Card className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center gap-sm">
        <span
          className="material-symbols-outlined text-[32px] text-secondary"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {outcome.icon}
        </span>
        <div className="flex flex-col gap-base">
          <h2 className="text-headline-sm font-bold text-on-surface">{meta.label}</h2>
          {decidedBy && (
            <p className="text-label-md text-on-surface-variant">
              Decided by {decidedBy}
              {decidedAt ? ` · ${fmtDate(decidedAt)}` : ''}
            </p>
          )}
        </div>
        <Badge tone={meta.tone} className="ml-auto">
          {meta.short}
        </Badge>
      </div>

      <p className="text-body-md leading-relaxed text-on-surface-variant">{outcome.message}</p>

      {feedback && <FeedbackNote from={decidedBy ?? journey.mentorName} feedback={feedback} at={decidedAt} />}

      {status === 'changes_requested' && (
        <div>
          <Button onClick={() => onOpenStage('poc')}>Update Proof of Concept</Button>
        </div>
      )}
      {status === 'selected' && (
        <div>
          <Button onClick={() => onOpenStage('final')}>Go to Final Project</Button>
        </div>
      )}
    </Card>
  )
}
