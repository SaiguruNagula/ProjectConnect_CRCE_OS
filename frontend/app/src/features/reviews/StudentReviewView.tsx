/**
 * Student Review Engine — read-only. Keeps the Stitch layout (status hero,
 * progress bento, active stage, decision, feedback, timeline, locked next step)
 * but reads the same journey the faculty reviewed, so the student sees the
 * reviewer's own words and the same seven timeline steps. Students can view
 * status, feedback and files; they can never approve or reject.
 */
import { Link } from 'react-router-dom'
import type { ProjectJourney, SubmissionStage } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { STAGES, nextAction, stageMeta, statusOf } from '@/features/submissions/status'
import { FeedbackNote } from '@/features/submissions/fields'
import { ReviewStatusBadge } from './ReviewStatusBadge'
import { LIFECYCLE_STATUS } from './stages'
import { ReviewTimeline } from './ReviewTimeline'
import { fmtDate } from '@/utils/date'

/** The most recent stage a faculty has actually written feedback on. */
function latestFeedback(journey: ProjectJourney) {
  for (const stage of ['final', 'poc', 'idea'] as const) {
    const state = journey[stage]
    if (state.review) return { stage, ...state }
  }
  return null
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="mb-xs ml-1 text-label-md font-bold uppercase tracking-tight text-on-surface-variant">
      {children}
    </h3>
  )
}

export function StudentReviewView({ journey }: { journey: ProjectJourney }) {
  const status = LIFECYCLE_STATUS[journey.status]
  const isLive = journey.status.endsWith('_submitted')
  const current = stageMeta(journey.currentStage)
  const currentStatus = statusOf(journey, journey.currentStage)
  const feedback = latestFeedback(journey)
  const approved = journey.timeline.filter((e) => e.done).length
  const next: SubmissionStage | undefined = STAGES.find(
    (s) => !journey.unlockedStages.includes(s.value),
  )?.value

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-sm px-sm py-md">
      {/* Hero status */}
      <div className="relative flex min-h-[160px] flex-col justify-center overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-lg shadow-sm">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />
        <p className="mb-xs text-label-md uppercase tracking-widest text-on-surface-variant/70">Review Status</p>
        <div className="flex items-baseline gap-xs">
          <h2 className="text-headline-lg-mobile text-primary">{status.label}</h2>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary-container/20 px-2 py-0.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
              <span className="text-[10px] font-medium text-secondary">LIVE</span>
            </span>
          )}
        </div>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {journey.problemTitle ?? journey.title}
        </p>
        <Link
          to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: journey.projectId })}
          className="mt-xs flex w-fit items-center gap-xs text-label-md font-medium text-secondary hover:underline"
        >
          Open {journey.title} submissions
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>

      {/* Progress bento */}
      <div className="grid grid-cols-3 gap-xs">
        <BentoTile icon="verified" iconClass="text-on-tertiary-fixed-variant" filled value={`${approved}/${journey.timeline.length}`} label="Steps Done" />
        <BentoTile icon="pending" iconClass="text-secondary-container" value={isLive ? 1 : 0} label="In Review" />
        <BentoTile
          icon={journey.credits ? 'military_tech' : 'lock'}
          iconClass={journey.credits ? 'text-secondary' : 'text-on-surface-variant/40'}
          value={journey.credits?.total ?? '--'}
          label="Credits"
          muted={!journey.credits}
        />
      </div>

      {/* Active stage */}
      <section>
        <SectionLabel>Active Stage</SectionLabel>
        <div className="space-y-md rounded-xl border border-l-4 border-outline-variant border-l-primary bg-surface-container-lowest p-lg">
          <div className="flex items-start justify-between gap-sm">
            <div>
              <h4 className="text-headline-sm">{current.label}</h4>
              <p className="text-body-md text-on-surface-variant">
                {nextAction(journey.currentStage, currentStatus)}
              </p>
            </div>
            <span className="material-symbols-outlined text-primary" aria-hidden="true">{current.icon}</span>
          </div>
          <div className="grid grid-cols-2 gap-sm pt-xs">
            <div className="space-y-1">
              <p className="text-label-md text-on-surface-variant/60">Team</p>
              <p className="text-body-md font-medium">{journey.teamName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-label-md text-on-surface-variant/60">Mentor</p>
              <p className="text-body-md font-medium">{journey.mentorName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Review decision */}
      <section>
        <SectionLabel>Review Decision</SectionLabel>
        {isLive ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-xl text-center">
            <span className="material-symbols-outlined mb-sm text-[32px] text-on-surface-variant/40" aria-hidden="true">
              hourglass_empty
            </span>
            <p className="text-body-md font-medium text-on-surface-variant">Decision Pending</p>
            <p className="max-w-sm text-label-md text-on-surface-variant/60">
              {journey.mentorName} is reviewing your {current.label.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">task_alt</span>
              <p className="text-body-md font-medium">
                {nextAction(journey.currentStage, currentStatus)}
              </p>
            </div>
            <ReviewStatusBadge status={journey.status} short />
          </div>
        )}
      </section>

      {/* Faculty feedback */}
      {feedback?.review && (
        <section>
          <SectionLabel>Faculty Feedback</SectionLabel>
          <FeedbackNote from={journey.mentorName} review={feedback.review} at={feedback.reviewedAt} />
        </section>
      )}

      {/* Submission timeline */}
      <section>
        <SectionLabel>Submission Timeline</SectionLabel>
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-lg">
          <ReviewTimeline events={journey.timeline} />
        </div>
      </section>

      {/* Credits + publication, once the project is finished */}
      {journey.credits && (
        <section>
          <SectionLabel>Credits Awarded</SectionLabel>
          <div className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <div>
              <p className="font-mono text-headline-sm text-primary">{journey.credits.total}</p>
              <p className="text-label-md text-on-surface-variant">
                {journey.credits.awardedBy}
                {journey.credits.awardedAt ? ` · ${fmtDate(journey.credits.awardedAt)}` : ''}
              </p>
            </div>
            {journey.published && (
              <Link
                to={ROUTES.SHARED.SOLUTIONS}
                className="flex items-center gap-xs text-label-md font-medium text-secondary hover:underline"
              >
                View in the Solutions Hub
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Next step (locked) */}
      {next && (
        <section>
          <div className="flex items-center justify-between rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-sm opacity-60">
            <div className="flex items-center gap-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
                <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">lock</span>
              </span>
              <div>
                <p className="text-label-md text-on-surface-variant">Next Step</p>
                <p className="text-body-md font-bold">{stageMeta(next).label}</p>
              </div>
            </div>
            <span className="font-mono text-label-md">Locked</span>
          </div>
        </section>
      )}
    </div>
  )
}

function BentoTile({
  icon,
  iconClass,
  value,
  label,
  filled = false,
  muted = false,
}: {
  icon: string
  iconClass: string
  value: number | string
  label: string
  filled?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-sm text-center">
      <span
        className={`material-symbols-outlined mb-1 ${iconClass}`}
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className={`text-headline-sm ${muted ? 'text-on-surface-variant/40' : ''}`}>{value}</p>
      <p className="text-label-md text-on-surface-variant">{label}</p>
    </div>
  )
}
