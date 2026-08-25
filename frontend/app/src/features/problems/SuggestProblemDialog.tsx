/**
 * "Suggest a Problem" — a student proposes a challenge and nominates a mentor.
 * Nothing here publishes: a suggestion goes to the chosen mentor as Pending
 * Mentor Review, and only their approval turns it into an Open Problem. Drafts
 * and returned suggestions can be reopened and edited from the list below.
 */
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ProblemSuggestion, ProblemSuggestionInput } from '@/types/domain'
import { useProblemSuggestions } from '@/hooks/useProblemSuggestions'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { Field, LinkLines, inputClass, textareaClass } from '@/components/ui/form'
import { fmtDate } from '@/utils/date'
import { SUGGESTION_STATUS, isSuggestionEditable } from './suggestionStatus'

const schema = z.object({
  title: z.string().min(8, 'Give the problem a title of at least 8 characters'),
  description: z.string().min(40, 'Describe the problem in at least 40 characters'),
  category: z.string().min(2, 'Pick a category'),
  importance: z.string().min(30, 'Explain why this matters in at least 30 characters'),
  expectedImpact: z.string().min(20, 'Describe the expected impact in at least 20 characters'),
  mentorId: z.string().min(1, 'Choose a mentor to review this'),
  referenceLinks: z.array(z.string().url()),
})
type SuggestionForm = z.infer<typeof schema>

const EMPTY: SuggestionForm = {
  title: '',
  description: '',
  category: '',
  importance: '',
  expectedImpact: '',
  mentorId: '',
  referenceLinks: [],
}

export function SuggestProblemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    suggestions,
    mentors,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError,
    dismissMessage,
    save,
  } = useProblemSuggestions()

  // The suggestion being edited, or null while composing a new one.
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SuggestionForm>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useUnsavedChanges(open && isDirty)

  // Leaving the dialog always starts the next visit from a clean sheet.
  useEffect(() => {
    if (!open) {
      reset(EMPTY)
      setEditingId(null)
    }
  }, [open, reset])

  const edit = (suggestion: ProblemSuggestion) => {
    setEditingId(suggestion.id)
    reset(suggestion.input)
  }

  const submitTo = async (values: SuggestionForm, submit: boolean) => {
    const ok = await save(values as ProblemSuggestionInput, submit, editingId ?? undefined)
    if (ok) {
      reset(EMPTY)
      setEditingId(null)
    }
  }

  const close = () => {
    if (isDirty && !window.confirm('Discard this suggestion? Your unsaved changes will be lost.')) return
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Suggest a Problem"
      description="Your suggestion goes to the mentor you choose. It becomes an Open Problem only after they approve it."
    >
      <div className="flex flex-col gap-md">
        <ActionBanner tone="success" message={actionMessage} onDismiss={dismissMessage} />
        <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />

        <form
          noValidate
          className="flex flex-col gap-md"
          onSubmit={handleSubmit((values) => submitTo(values, true))}
        >
          <Field label="Problem Title" error={errors.title?.message}>
            <input {...register('title')} className={inputClass} placeholder="e.g. Lab equipment booking clashes" />
          </Field>

          <Field
            label="Problem Description"
            hint="What happens today, who it affects and how often."
            error={errors.description?.message}
          >
            <textarea {...register('description')} rows={4} className={textareaClass} />
          </Field>

          <Field label="Category" error={errors.category?.message}>
            <input {...register('category')} className={inputClass} placeholder="e.g. Campus Operations" />
          </Field>

          <Field label="Why is this problem important?" error={errors.importance?.message}>
            <textarea {...register('importance')} rows={3} className={textareaClass} />
          </Field>

          <Field label="Expected Impact" error={errors.expectedImpact?.message}>
            <textarea {...register('expectedImpact')} rows={3} className={textareaClass} />
          </Field>

          <Field
            label="Suggested Mentor"
            hint="They review the suggestion and decide whether it is published."
            error={errors.mentorId?.message}
          >
            <select {...register('mentorId')} className={inputClass} disabled={loading}>
              <option value="">{loading ? 'Loading mentors…' : 'Select a mentor'}</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {/* No separator for a mentor who has set no department. */}
                  {mentor.department ? `${mentor.name} · ${mentor.department}` : mentor.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reference Links" optional hint="One URL per line." error={errors.referenceLinks?.message}>
            <Controller
              control={control}
              name="referenceLinks"
              render={({ field }) => (
                <LinkLines value={field.value} onChange={field.onChange} placeholder="https://…" />
              )}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-sm border-t border-outline-variant pt-md">
            <Button type="submit" disabled={busy}>
              {busy ? 'Working…' : 'Send for Mentor Review'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => submitTo(getValues(), false)}
            >
              Save Draft
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>
              Cancel
            </Button>
            {editingId && (
              <span className="ml-auto text-label-sm text-on-surface-variant" role="status">
                Editing a saved suggestion
              </span>
            )}
          </div>
        </form>

        <section className="flex flex-col gap-sm border-t border-outline-variant pt-md">
          <h3 className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Your suggestions
          </h3>
          {error ? (
            <EmptyState icon="error" title="Couldn’t load your suggestions" description={error} />
          ) : suggestions.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              {loading ? 'Loading…' : 'You have not suggested a problem yet.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-sm">
              {suggestions.map((suggestion) => (
                <SuggestionRow key={suggestion.id} suggestion={suggestion} onEdit={() => edit(suggestion)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  )
}

function SuggestionRow({ suggestion, onEdit }: { suggestion: ProblemSuggestion; onEdit: () => void }) {
  const meta = SUGGESTION_STATUS[suggestion.status]
  return (
    <li className="flex flex-col gap-xs rounded-xl border border-outline-variant p-sm">
      <div className="flex flex-wrap items-center gap-xs">
        <span className="flex-1 text-body-md font-semibold text-on-surface">{suggestion.input.title}</span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="text-label-sm text-on-surface-variant">
        Mentor · {suggestion.mentorName} · submitted {fmtDate(suggestion.submittedAt)}
      </p>
      {suggestion.mentorFeedback && (
        <p className="rounded-lg bg-surface-container-low p-xs text-label-md leading-relaxed text-on-surface">
          “{suggestion.mentorFeedback}”
        </p>
      )}
      {isSuggestionEditable(suggestion.status) && (
        <div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit and resubmit
          </Button>
        </div>
      )}
    </li>
  )
}
