/**
 * Stage 1 — Idea. Captures what the team wants to build and how, saves it as a
 * draft or submits it for review, and once submitted becomes a read-only record
 * with the reviewer's feedback attached. The roster is shown from the team, not
 * re-entered here.
 */
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { IdeaSubmission, ProjectJourney } from '@/types/domain'
import { QUERY_PARAMS, ROUTES, withQuery } from '@/constants/routes'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { TagInput } from '@/components/ui/TagInput'
import { Field, LinkLines, inputClass, textareaClass } from '@/components/ui/form'
import { FeedbackNote, StageActions } from './fields'
import { isEditable } from './status'
import { StageSummary } from './StageSummary'

const optionalUrl = z.union([z.literal(''), z.string().url('Enter a valid URL')]).optional()

const schema = z.object({
  title: z.string().min(4, 'Give your project a title of at least 4 characters'),
  problemStatement: z.string().min(30, 'Describe the problem in at least 30 characters'),
  proposedSolution: z.string().min(30, 'Describe your solution in at least 30 characters'),
  approach: z.string().min(30, 'Describe your approach in at least 30 characters'),
  techStack: z.array(z.string()).min(1, 'List at least one technology'),
  expectedOutcome: z.string().min(20, 'Describe the expected outcome in at least 20 characters'),
  presentationUrl: optionalUrl,
  supportingLinks: z.array(z.string().url()),
})
type IdeaForm = z.infer<typeof schema>

const EMPTY: IdeaForm = {
  title: '',
  problemStatement: '',
  proposedSolution: '',
  approach: '',
  techStack: [],
  expectedOutcome: '',
  presentationUrl: '',
  supportingLinks: [],
}

interface IdeaStageProps {
  journey: ProjectJourney
  busy: boolean
  onSave: (values: IdeaSubmission, submit: boolean) => Promise<boolean>
}

export function IdeaStage({ journey, busy, onSave }: IdeaStageProps) {
  const stage = journey.idea
  const editable = isEditable(stage.status)
  // Identity changes only when the server state does, so the reset below fires
  // on save/submit/reload and never mid-edit.
  const saved = useMemo<IdeaForm>(
    () => ({ ...EMPTY, ...stage.data, title: stage.data?.title ?? journey.title }),
    [stage.data, journey.title],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<IdeaForm>({ resolver: zodResolver(schema), defaultValues: saved })

  // Re-seed the form whenever the server state changes (save, submit, reload).
  useEffect(() => reset(saved), [saved, reset])
  useUnsavedChanges(isDirty)

  const toSubmission = (values: IdeaForm): IdeaSubmission => ({
    ...values,
    presentationUrl: values.presentationUrl || undefined,
  })

  return (
    <div className="flex flex-col gap-md">
      {stage.facultyFeedback && (
        <FeedbackNote from={journey.mentorName} feedback={stage.facultyFeedback} at={stage.reviewedAt} />
      )}

      <Card className="flex flex-col gap-md">
        <TeamRoster journey={journey} />

        {editable ? (
          <form
            noValidate
            className="flex flex-col gap-md"
            onSubmit={handleSubmit((values) => onSave(toSubmission(values), true))}
          >
            <Field label="Project Title" error={errors.title?.message}>
              <input {...register('title')} className={inputClass} aria-invalid={!!errors.title} />
            </Field>

            <Field
              label="Problem Statement"
              hint="What is wrong today, and who does it affect?"
              error={errors.problemStatement?.message}
            >
              <textarea {...register('problemStatement')} rows={4} className={textareaClass} />
            </Field>

            <Field label="Proposed Solution" error={errors.proposedSolution?.message}>
              <textarea {...register('proposedSolution')} rows={4} className={textareaClass} />
            </Field>

            <Field
              label="Approach"
              hint="How will you build it? Name the steps in order."
              error={errors.approach?.message}
            >
              <textarea {...register('approach')} rows={4} className={textareaClass} />
            </Field>

            <Field label="Technology Stack" hint="Press Enter after each one." error={errors.techStack?.message}>
              <Controller
                control={control}
                name="techStack"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={field.onChange} placeholder="e.g. React, FastAPI" />
                )}
              />
            </Field>

            <Field label="Expected Outcome" error={errors.expectedOutcome?.message}>
              <textarea {...register('expectedOutcome')} rows={3} className={textareaClass} />
            </Field>

            <Field label="Presentation" optional error={errors.presentationUrl?.message}>
              <input {...register('presentationUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Supporting Links" optional hint="One URL per line." error={errors.supportingLinks?.message}>
              <Controller
                control={control}
                name="supportingLinks"
                render={({ field }) => (
                  <LinkLines value={field.value} onChange={field.onChange} placeholder="https://…" />
                )}
              />
            </Field>

            <StageActions
              submitLabel="Submit Idea"
              busy={busy}
              dirty={isDirty}
              onReset={() => reset(saved)}
              onSaveDraft={() => onSave(toSubmission(getValues()), false)}
            />
          </form>
        ) : (
          <StageSummary
            emptyMessage="No idea recorded."
            rows={[
              { label: 'Project Title', value: stage.data?.title },
              { label: 'Problem Statement', value: stage.data?.problemStatement },
              { label: 'Proposed Solution', value: stage.data?.proposedSolution },
              { label: 'Approach', value: stage.data?.approach },
              { label: 'Technology Stack', value: stage.data?.techStack.join(', ') },
              { label: 'Expected Outcome', value: stage.data?.expectedOutcome },
              { label: 'Presentation', value: stage.data?.presentationUrl, link: true },
              { label: 'Supporting Links', value: stage.data?.supportingLinks, link: true },
            ]}
          />
        )}
      </Card>
    </div>
  )
}

/** The team on record. Membership is owned by Team Formation, never re-entered. */
function TeamRoster({ journey }: { journey: ProjectJourney }) {
  return (
    <div className="flex flex-col gap-xs rounded-xl bg-surface-container-low p-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-xs">
        <span className="text-label-md font-semibold text-on-surface">
          Team Members · {journey.teamName}
        </span>
        {journey.problemId && (
          <Link
            to={withQuery(ROUTES.SHARED.TEAM_FORMATION, { [QUERY_PARAMS.PROBLEM]: journey.problemId })}
            className="text-label-md font-medium text-secondary hover:underline"
          >
            Manage team
          </Link>
        )}
      </div>
      <ul className="flex flex-wrap gap-sm">
        {journey.members.map((m) => (
          <li key={m.id} className="flex items-center gap-xs">
            <Avatar initials={m.avatarInitials} size="sm" />
            <span className="text-label-md text-on-surface-variant">
              {m.name} · {m.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
