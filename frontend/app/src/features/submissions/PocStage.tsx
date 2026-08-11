/**
 * Stage 2 — Proof of Concept. Evidence that the idea runs: repository, demo,
 * prototype images and supporting material. Locked to a read-only record once
 * submitted, with the reviewer's feedback shown above it.
 */
import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PocSubmission, ProjectJourney } from '@/types/domain'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Card } from '@/components/ui/Card'
import { Field, LinkLines, inputClass, textareaClass } from '@/components/ui/form'
import { FeedbackNote, StageActions } from './fields'
import { isEditable } from './status'
import { StageSummary } from './StageSummary'
import { pocRows } from './summaryRows'

const optionalUrl = z.union([z.literal(''), z.string().url('Enter a valid URL')]).optional()

const schema = z.object({
  description: z.string().min(30, 'Describe your proof of concept in at least 30 characters'),
  githubUrl: z.string().url('Enter the repository URL'),
  demoUrl: optionalUrl,
  prototypeImages: z.array(z.string().url()),
  presentationUrl: optionalUrl,
  videoUrl: optionalUrl,
  documents: z.array(z.string().url()),
})
type PocForm = z.infer<typeof schema>

const EMPTY: PocForm = {
  description: '',
  githubUrl: '',
  demoUrl: '',
  prototypeImages: [],
  presentationUrl: '',
  videoUrl: '',
  documents: [],
}

interface PocStageProps {
  journey: ProjectJourney
  busy: boolean
  onSave: (values: PocSubmission, submit: boolean) => Promise<boolean>
}

export function PocStage({ journey, busy, onSave }: PocStageProps) {
  const stage = journey.poc
  const editable = isEditable(stage.status)
  // Identity changes only when the server state does, so the reset below fires
  // on save/submit/reload and never mid-edit.
  const saved = useMemo<PocForm>(() => ({ ...EMPTY, ...stage.data }), [stage.data])

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<PocForm>({ resolver: zodResolver(schema), defaultValues: saved })

  useEffect(() => reset(saved), [saved, reset])
  useUnsavedChanges(isDirty)

  const toSubmission = (values: PocForm): PocSubmission => ({
    ...values,
    demoUrl: values.demoUrl || undefined,
    presentationUrl: values.presentationUrl || undefined,
    videoUrl: values.videoUrl || undefined,
  })

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
              label="Proof of Concept Description"
              hint="What works today, and what is still stubbed out?"
              error={errors.description?.message}
            >
              <textarea {...register('description')} rows={5} className={textareaClass} />
            </Field>

            <Field label="GitHub Repository" error={errors.githubUrl?.message}>
              <input {...register('githubUrl')} className={inputClass} placeholder="https://github.com/…" />
            </Field>

            <Field label="Demo Link" optional error={errors.demoUrl?.message}>
              <input {...register('demoUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field
              label="Prototype Images"
              optional
              hint="One image URL per line."
              error={errors.prototypeImages?.message}
            >
              <Controller
                control={control}
                name="prototypeImages"
                render={({ field }) => <LinkLines value={field.value} onChange={field.onChange} />}
              />
            </Field>

            <Field label="Presentation" optional error={errors.presentationUrl?.message}>
              <input {...register('presentationUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Video Link" optional error={errors.videoUrl?.message}>
              <input {...register('videoUrl')} className={inputClass} placeholder="https://…" />
            </Field>

            <Field label="Documents" optional hint="One URL per line." error={errors.documents?.message}>
              <Controller
                control={control}
                name="documents"
                render={({ field }) => <LinkLines value={field.value} onChange={field.onChange} />}
              />
            </Field>

            <StageActions
              submitLabel="Submit Proof of Concept"
              busy={busy}
              dirty={isDirty}
              onReset={() => reset(saved)}
              onSaveDraft={() => onSave(toSubmission(getValues()), false)}
            />
          </form>
        ) : (
          <StageSummary emptyMessage="No proof of concept recorded." rows={pocRows(stage.data)} />
        )}
      </Card>
    </div>
  )
}
