/**
 * Evaluating one submission. Keeps the Stitch review-panel layout — header with
 * the team and mentor, the submitted artifacts, a Faculty Evaluation block and
 * the decision row — but drives it from the stage under review, so the fields,
 * the actions and the primary button all change with the stage rather than the
 * component. No transition is decided here: the panel collects a verdict and
 * hands it to useFacultyReview.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import type { CreditAwardInput, ProjectJourney, ReviewableStage, StageReviewInput } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, inputClass, textareaClass } from '@/components/ui/form'
import { StageSummary } from '@/features/submissions/StageSummary'
import { FeedbackNote } from '@/features/submissions/fields'
import { EVALUATION_SCORES } from '@/features/submissions/status'
import { ReviewStatusBadge } from './ReviewStatusBadge'
import { ReviewTimeline } from './ReviewTimeline'
import { ReviewDecisionDialog } from './ReviewDecisionDialog'
import { CreditAwardDialog } from './CreditAwardDialog'
import { PublishDialog } from './PublishDialog'
import { STAGE_REVIEW, type DecisionMeta } from './stages'

interface ReviewForm {
  strengths: string
  weaknesses: string
  suggestions: string
  comments: string
  innovation: number
  technicalQuality: number
  implementation: number
  documentation: number
  presentation: number
  overallRemarks: string
}

const EMPTY_FORM: ReviewForm = {
  strengths: '',
  weaknesses: '',
  suggestions: '',
  comments: '',
  innovation: 0,
  technicalQuality: 0,
  implementation: 0,
  documentation: 0,
  presentation: 0,
  overallRemarks: '',
}

interface StageReviewPanelProps {
  journey: ProjectJourney
  stage: ReviewableStage
  /** False in the Completed queue, where the panel is a read-only record. */
  editable: boolean
  busy: boolean
  onDecide: (input: StageReviewInput, message: string) => Promise<boolean>
  onAwardCredits: (input: CreditAwardInput) => Promise<boolean>
  onPublish: (projectId: string, publish: boolean) => Promise<boolean>
}

export function StageReviewPanel({
  journey,
  stage,
  editable,
  busy,
  onDecide,
  onAwardCredits,
  onPublish,
}: StageReviewPanelProps) {
  const meta = STAGE_REVIEW[stage]
  const state = journey[stage]
  const isFinal = stage === 'final'

  const {
    register,
    getValues,
    reset,
    formState: { isDirty },
  } = useForm<ReviewForm>({ defaultValues: EMPTY_FORM })

  // A new submission is a new verdict — never carry a draft across teams.
  useEffect(() => reset(EMPTY_FORM), [journey.projectId, stage, reset])
  useUnsavedChanges(isDirty)

  const [pending, setPending] = useState<DecisionMeta | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const rows = useMemo(() => meta.rows(journey), [meta, journey])
  const shown = journey.members.slice(0, 3)
  const overflow = journey.members.length - shown.length

  function request(decision: DecisionMeta) {
    const values = getValues()
    const wrote = [values.strengths, values.weaknesses, values.suggestions, values.comments].some((v) =>
      v.trim(),
    )
    if (decision.decision !== 'approve' && decision.decision !== 'select' && !wrote) {
      setValidation('Add feedback before requesting changes or rejecting — the team needs to know why.')
      return
    }
    if (isFinal && decision.decision === 'approve' && !values.overallRemarks.trim()) {
      setValidation('Record your overall remarks before approving the final project.')
      return
    }
    setValidation(null)
    setPending(decision)
  }

  async function confirm() {
    if (!pending) return
    const values = getValues()
    const ok = await onDecide(
      {
        projectId: journey.projectId,
        stage,
        decision: pending.decision,
        review: {
          strengths: values.strengths.trim() || undefined,
          weaknesses: values.weaknesses.trim() || undefined,
          suggestions: values.suggestions.trim() || undefined,
          comments: values.comments.trim() || undefined,
          evaluation: isFinal
            ? {
                innovation: values.innovation,
                technicalQuality: values.technicalQuality,
                implementation: values.implementation,
                documentation: values.documentation,
                presentation: values.presentation,
                overallRemarks: values.overallRemarks.trim(),
              }
            : undefined,
        },
      },
      `${meta.label} — ${pending.label.toLowerCase()} for ${journey.teamName}.`,
    )
    setPending(null)
    if (ok) reset(EMPTY_FORM)
  }

  return (
    <div className="flex flex-col gap-lg rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-lg">
      {/* Header — who submitted, who mentors them, and where to read more */}
      <div className="flex flex-col justify-between gap-md border-b border-outline-variant/30 pb-lg md:flex-row md:items-start">
        <div className="flex flex-col gap-xs">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="text-headline-md text-primary">Detailed Review: {journey.teamName}</h2>
            <ReviewStatusBadge status={journey.status} />
          </div>
          <p className="text-on-surface-variant">
            {meta.label} · Mentor:{' '}
            <span className="font-semibold text-secondary">{journey.mentorName}</span>
          </p>
          <nav className="flex flex-wrap gap-md" aria-label="Related records">
            {journey.problemId && (
              <PanelLink
                to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: journey.problemId })}
                icon="assignment"
              >
                {journey.problemTitle ?? 'Problem details'}
              </PanelLink>
            )}
            {/* ponytail: the submissions themselves are already open in this
                panel — /student/projects/:id is student-only and would bounce
                faculty back to their dashboard. */}
            {journey.members[0] && (
              <PanelLink
                to={buildPath(ROUTES.SHARED.PORTFOLIO, { id: journey.members[0].id })}
                icon="badge"
              >
                {journey.members.length > 1 ? 'Team profiles' : 'Student profile'}
              </PanelLink>
            )}
            {journey.published && (
              <PanelLink to={ROUTES.SHARED.SOLUTIONS} icon="public">
                Solutions Hub
              </PanelLink>
            )}
          </nav>
        </div>
        <div className="flex -space-x-2">
          {shown.map((m) => (
            <Avatar
              key={m.id}
              initials={m.avatarInitials}
              size="sm"
              className="border-2 border-surface-container-lowest"
            />
          ))}
          {overflow > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-highest text-[10px] font-bold">
              +{overflow}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        {/* Submitted content */}
        <section className="lg:col-span-2">
          <h3 className="mb-sm flex items-center gap-2 text-headline-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">folder_open</span>
            Submitted {meta.label}
          </h3>
          <StageSummary rows={rows} emptyMessage={`No ${meta.label.toLowerCase()} was submitted.`} />
        </section>

        {/* Timeline */}
        <section>
          <h3 className="mb-sm flex items-center gap-2 text-headline-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">timeline</span>
            Submission Timeline
          </h3>
          <ReviewTimeline events={journey.timeline} />
        </section>
      </div>

      {editable ? (
        <>
          {/* Faculty evaluation */}
          <section className="flex flex-col gap-md border-t border-outline-variant/30 pt-lg">
            <h3 className="flex items-center gap-2 text-headline-sm">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">rate_review</span>
              Faculty Evaluation
            </h3>

            {isFinal && (
              <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
                {EVALUATION_SCORES.map((score) => (
                  <Field key={score.key} label={score.label} hint="0–10">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      {...register(score.key, { valueAsNumber: true })}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                ))}
              </div>
            )}

            <Field label="Strengths" hint="What works, and is worth keeping.">
              <textarea {...register('strengths')} rows={3} className={textareaClass} />
            </Field>
            <Field label="Weaknesses" hint="What is missing, weak or unproven.">
              <textarea {...register('weaknesses')} rows={3} className={textareaClass} />
            </Field>
            <Field label="Suggestions" hint="What the team should do next.">
              <textarea {...register('suggestions')} rows={3} className={textareaClass} />
            </Field>
            {isFinal ? (
              <Field label="Overall Remarks">
                <textarea {...register('overallRemarks')} rows={3} className={textareaClass} />
              </Field>
            ) : (
              <Field label="Comments" optional>
                <textarea {...register('comments')} rows={2} className={textareaClass} />
              </Field>
            )}

            {validation && (
              <p className="text-label-md text-error" role="alert">
                {validation}
              </p>
            )}
          </section>

          {/* Decisions — the affirmative action first, and it changes per stage */}
          <div className="flex flex-col gap-sm border-t border-outline-variant/30 pt-md sm:flex-row sm:flex-wrap sm:items-center">
            {isDirty && (
              <span className="order-last mr-auto flex items-center gap-xs text-label-md uppercase text-on-surface-variant sm:order-first" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
                Unsaved evaluation
              </span>
            )}
            {meta.decisions.map((decision) => (
              <Button
                key={decision.decision}
                variant={
                  decision.tone === 'error' ? 'danger' : decision.tone === 'neutral' ? 'outline' : 'primary'
                }
                size="lg"
                disabled={busy}
                onClick={() => request(decision)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{decision.icon}</span>
                {decision.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        /* Completed — the verdict on record, plus the two post-approval actions */
        <section className="flex flex-col gap-md border-t border-outline-variant/30 pt-lg">
          {state.review ? (
            <FeedbackNote from={journey.mentorName} review={state.review} at={state.reviewedAt} />
          ) : (
            <p className="text-body-md text-on-surface-variant">No written feedback was recorded.</p>
          )}

          {journey.final.status === 'approved' && (
            <div className="flex flex-wrap items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <div className="mr-auto flex flex-col gap-base">
                <span className="text-label-md uppercase tracking-wide text-on-surface-variant">
                  Credits Awarded
                </span>
                <span className="font-mono text-headline-sm text-primary">
                  {journey.credits ? journey.credits.total : 'Not yet awarded'}
                </span>
              </div>
              <Button variant="outline" disabled={busy} onClick={() => setCreditsOpen(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">military_tech</span>
                {journey.credits ? 'Revise Credits' : 'Award Credits'}
              </Button>
              <Button disabled={busy} onClick={() => setPublishOpen(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {journey.published ? 'public' : 'ios_share'}
                </span>
                {journey.published ? 'Published — Change' : 'Publish to Solutions Hub'}
              </Button>
            </div>
          )}
        </section>
      )}

      <ReviewDecisionDialog
        decision={pending}
        stageLabel={meta.label}
        teamName={journey.teamName}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
      <CreditAwardDialog
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        projectId={journey.projectId}
        teamName={journey.teamName}
        awarded={journey.credits}
        busy={busy}
        onAward={onAwardCredits}
      />
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        teamName={journey.teamName}
        busy={busy}
        onDecide={(publish) => onPublish(journey.projectId, publish)}
      />
    </div>
  )
}

function PanelLink({ to, icon, children }: { to: string; icon: string; children: string }) {
  return (
    <Link
      to={to}
      className="flex w-fit items-center gap-xs text-label-md font-medium text-secondary hover:underline"
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      {children}
    </Link>
  )
}
