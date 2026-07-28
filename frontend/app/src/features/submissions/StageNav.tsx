/**
 * The four-stage progress rail. Shows where the team is in the lifecycle and
 * lets the student open any stage they have unlocked; locked stages stay
 * visible so the path ahead is obvious, but cannot be opened.
 */
import type { ProjectJourney, SubmissionStage } from '@/types/domain'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { STAGES, STAGE_STATUS, statusOf } from './status'

/** Why a stage cannot be opened yet — Stage 1 is never locked. */
const LOCK_REASON: Record<SubmissionStage, string> = {
  idea: '',
  poc: 'Unlocks once you submit your idea.',
  selection: 'Unlocks once you submit your proof of concept.',
  final: 'Unlocks only for teams selected for final development.',
}

interface StageNavProps {
  journey: ProjectJourney
  active: SubmissionStage
  onSelect: (stage: SubmissionStage) => void
}

export function StageNav({ journey, active, onSelect }: StageNavProps) {
  return (
    <ol className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Submission stages">
      {STAGES.map((stage, index) => {
        const unlocked = journey.unlockedStages.includes(stage.value)
        const status = statusOf(journey, stage.value)
        const meta = STAGE_STATUS[status]
        const isActive = stage.value === active
        return (
          <li key={stage.value}>
            <button
              type="button"
              disabled={!unlocked}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onSelect(stage.value)}
              className={cn(
                'flex h-full w-full flex-col items-start gap-xs rounded-xl border p-sm text-left transition-colors',
                isActive
                  ? 'border-secondary bg-secondary-container/15'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-secondary',
                !unlocked && 'cursor-not-allowed opacity-55 hover:border-outline-variant',
              )}
            >
              <span className="flex w-full items-center gap-xs">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-md font-bold',
                    isActive ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-body-md font-semibold text-on-surface">{stage.label}</span>
                {!unlocked && (
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
                    lock
                  </span>
                )}
              </span>
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="text-label-sm leading-snug text-on-surface-variant">
                {unlocked ? stage.blurb : LOCK_REASON[stage.value]}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
