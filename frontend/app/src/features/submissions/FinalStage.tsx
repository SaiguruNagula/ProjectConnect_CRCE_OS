/**
 * Stage 4 — Final Project. Only reachable by teams selected for final
 * development; the repository refuses a save otherwise, so this component only
 * has to render the form and the locked record.
 */
import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { FinalSubmission, ProjectJourney } from '@/types/domain'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Card } from '@/components/ui/Card'
import { TagInput } from '@/components/ui/TagInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, LinkLines, inputClass, textareaClass } from '@/components/ui/form'
import { FeedbackNote, StageActions } from './fields'
import { isEditable } from './status'
import { StageSummary } from './StageSummary'
import { finalRows } from './summaryRows'

const optionalUrl = z.union([z.literal(''), z.string().url('Enter a valid URL')]).optional()

const schema = z.object({
  description: z.string().min(30, 'Describe the finished project in at least 30 characters'),
  githubUrl: z.string().url('Enter the repository URL'),
  liveUrl: optionalUrl,
  demoUrl: optionalUrl,
  presentationUrl: optionalUrl,
  reportUrl: optionalUrl,
  videoUrl: optionalUrl,
  techStack: z.array(z.string()).min(1, 'List at least one technology'),
  screenshots: z.array(z.string().url()),
  documents: z.array(z.string().url()),
})
type FinalForm = z.infer<typeof schema>

const EMPTY: FinalForm = {
  description: '',
  githubUrl: '',
  liveUrl: '',
  demoUrl: '',
  presentationUrl: '',
  reportUrl: '',
  videoUrl: '',
  techStack: [],
  screenshots: [],
  documents: [],
}

interface FinalStageProps {
  journey: ProjectJourney
  busy: boolean
  onSave: (values: FinalSubmission, submit: boolean) => Promise<boolean>
}

export function FinalStage({ journey, busy, onSave }: FinalStageProps) {
  const stage = journey.final
  const selected = journey.selection.status === 'selected'
  const editable = selected && isEditable(stage.status)
  // Carry the stack forward from the idea rather than asking for it twice.
  // Identity changes only when the server state does, so the reset below fires
  // on save/submit/reload and never mid-edit.
  const ideaStack = journey.idea.data?.techStack
  const saved = useMemo<FinalForm>(
    () => ({ ...EMPTY, techStack: ideaStack ?? EMPTY.techStack, ...stage.data }),
    [stage.data, ideaStack],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FinalForm>({ resolver: zodResolver(schema), defaultValues: saved })

  useEffect(() => reset(saved), [saved, reset])
  useUnsavedChanges(isDirty)

  const toSubmission = (values: FinalForm): FinalSubmission => ({
    ...values,
    liveUrl: values.liveUrl || undefined,
    demoUrl: values.demoUrl || undefined,
    presentationUrl: values.presentationUrl || undefined,
    reportUrl: values.reportUrl || undefined,
    videoUrl: values.videoUrl || undefined,
  })

  if (!selected) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Final project locked"
          description="Only teams selected for final development can submit a final project. Faculty review your proof of concept in Stage 3."
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-md">
      {stage.review && (
        <FeedbackNote from={journey.mentorName} review={stage.review} at={stage.reviewedAt} />
      )}

      <Card className="flex flex-col gap-md">
        {editable ? (
          <form
            noValidate
            className="flex flex-col gap-md"
            onSubmit={handleSubmit((values) => onSave(toSubmission(values), true))}
          >
            <Field
              label="Final Project Description"
              hint="What did you ship, and what does it do for the people who use it?"
              error={errors.description?.message}
            >
              <textarea {...register('description')} rows={5} className={textareaClass} />
            </Field>

            <Field label="GitHub Repository" error={errors.githubUrl?.message}>
              <input {...register('githubUrl')} className={inputClass} placeholder="https://github.com/…" />
            </Field>

            <Field label="Live Project Link" optional error={errors.liveUrl?.message}>
              <input {...register('liveUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Working Demo Link" optional error={errors.demoUrl?.message}>
              <input {...register('demoUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Final Presentation" optional error={errors.presentationUrl?.message}>
              <input {...register('presentationUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Project Report" optional error={errors.reportUrl?.message}>
              <input {...register('reportUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Demo Video" optional error={errors.videoUrl?.message}>
              <input {...register('videoUrl')} className={inputClass} placeholder="https://…" />
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

            <Field
              label="Final Screenshots"
              optional
              hint="One image URL per line."
              error={errors.screenshots?.message}
            >
              <Controller
                control={control}
                name="screenshots"
                render={({ field }) => <LinkLines value={field.value} onChange={field.onChange} />}
              />
            </Field>

            <Field
              label="Additional Documents"
              optional
              hint="One URL per line."
              error={errors.documents?.message}
            >
              <Controller
                control={control}
                name="documents"
                render={({ field }) => <LinkLines value={field.value} onChange={field.onChange} />}
              />
            </Field>

            <StageActions
              submitLabel="Submit Final Project"
              busy={busy}
              dirty={isDirty}
              onReset={() => reset(saved)}
              onSaveDraft={() => onSave(toSubmission(getValues()), false)}
            />
          </form>
        ) : (
          <StageSummary emptyMessage="No final project recorded." rows={finalRows(stage.data)} />
        )}
      </Card>
    </div>
  )
}
