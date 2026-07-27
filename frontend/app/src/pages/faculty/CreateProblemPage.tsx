/**
 * Faculty Create Problem — faithful migration of the Stitch "Create Problem
 * Module" bento layout (frontend/crce_os_faculty_create_problem_module): core
 * details, a live readiness score, impact rationale, a skills/tools requirement
 * builder, team dynamics + milestone timeline, and the (informational) credit +
 * evaluation engine cards, over a sticky Save Draft / Publish action bar.
 *
 * Validation is React Hook Form + Zod. The mutation is delegated to
 * useCreateProblem → problemsService → repository, so no API/business logic
 * lives in this component and the published problem flows into Open Problems.
 * App chrome (sidebar, top bar, mobile nav) is owned by FacultyLayout.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateProblem } from '@/hooks/useCreateProblem'
import { DEPARTMENTS, DIFFICULTIES } from '@/constants/catalog'
import { ROUTES } from '@/constants/routes'
import type { CreateProblemInput } from '@/types/domain'
import { cn } from '@/utils/cn'
import { TagInput } from '@/components/ui/TagInput'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  department: z.enum(DEPARTMENTS),
  summary: z.string().min(10, 'Add a one-sentence hook (min 10 characters)'),
  statement: z.string().min(20, 'Describe the problem in at least 20 characters'),
  currentChallenge: z.string().optional(),
  expectedImpact: z.string().optional(),
  difficulty: z.enum(DIFFICULTIES),
  skills: z.array(z.string()).min(1, 'Add at least one required skill'),
  tools: z.array(z.string()),
  teamSize: z.number().int().min(1).max(6),
  allowIndividualEntry: z.boolean(),
  registrationDate: z.string().min(1, 'Set a registration date'),
  deadlineDate: z.string().min(1, 'Set a submission deadline'),
  baseCredits: z.number({ message: 'Enter base credits' }).int().min(50, 'Minimum 50 credits').max(5000),
})

type ProblemForm = z.infer<typeof schema>

const DEFAULTS: ProblemForm = {
  title: '',
  department: DEPARTMENTS[0],
  summary: '',
  statement: '',
  currentChallenge: '',
  expectedImpact: '',
  difficulty: 'Intermediate',
  skills: [],
  tools: [],
  teamSize: 4,
  allowIndividualEntry: true,
  registrationDate: '',
  deadlineDate: '',
  baseCredits: 500,
}

/** Difficulty → credit multiplier (display only; mirrors the Credit Engine policy). */
const MULTIPLIER: Record<ProblemForm['difficulty'], number> = {
  Beginner: 1.0,
  Intermediate: 1.25,
  Advanced: 1.5,
}

/** Required fields for a publishable problem, in the order surfaced to the user. */
const REQUIRED: { key: keyof ProblemForm; label: string; filled: (v: ProblemForm) => boolean }[] = [
  { key: 'title', label: 'Problem title', filled: (v) => v.title.trim().length >= 5 },
  { key: 'summary', label: 'Short summary', filled: (v) => v.summary.trim().length >= 10 },
  { key: 'statement', label: 'Detailed statement', filled: (v) => v.statement.trim().length >= 20 },
  { key: 'skills', label: 'Required skills', filled: (v) => v.skills.length > 0 },
  { key: 'registrationDate', label: 'Registration date', filled: (v) => !!v.registrationDate },
  { key: 'deadlineDate', label: 'Submission deadline', filled: (v) => !!v.deadlineDate },
  { key: 'baseCredits', label: 'Base credits', filled: (v) => v.baseCredits >= 50 },
]

const LABEL = 'text-label-md uppercase text-on-surface-variant'
const INPUT =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-sm py-xs text-body-md text-on-surface outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/20'

export function CreateProblemPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { submitting, result, error, publish, saveDraft, dismiss } = useCreateProblem()

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ProblemForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS, mode: 'onTouched' })

  const values = watch()
  const filledCount = REQUIRED.filter((r) => r.filled(values)).length
  const readiness = Math.round((filledCount / REQUIRED.length) * 100)
  const missing = REQUIRED.filter((r) => !r.filled(values))

  function toInput(v: ProblemForm): CreateProblemInput {
    return { ...v, facultyName: user?.name ?? 'Faculty' }
  }

  const onPublish = handleSubmit(async (v) => {
    const created = await publish(toInput(v))
    if (created) {
      reset(DEFAULTS)
      // Give the success banner a beat, then send them to the live catalog.
      setTimeout(() => navigate(ROUTES.SHARED.OPEN_PROBLEMS), 1200)
    }
  })

  async function onSaveDraft() {
    // Drafts may be incomplete — persist whatever exists, requiring only a title.
    const v = getValues()
    if (v.title.trim().length < 3) return
    await saveDraft(toInput(v))
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Header */}
      <header className="mb-lg flex flex-col gap-xs">
        <h1 className="text-headline-lg font-bold tracking-tight text-primary">Create Problem</h1>
        <p className="text-body-lg text-on-surface-variant">Define an innovation challenge for the student ecosystem.</p>
      </header>

      {/* Status banners */}
      {result?.kind === 'published' && (
        <Banner tone="success" icon="check_circle" onClose={dismiss}>
          Problem “{result.title}” published — redirecting to Open Problems…
        </Banner>
      )}
      {result?.kind === 'draft' && (
        <Banner tone="info" icon="save" onClose={dismiss}>
          Draft saved. You can finish and publish it any time.
        </Banner>
      )}
      {error && (
        <Banner tone="error" icon="error" onClose={dismiss}>
          {error}
        </Banner>
      )}

      <form onSubmit={onPublish} noValidate className="grid grid-cols-1 items-start gap-md pb-lg md:grid-cols-12">
        {/* Core Details */}
        <BentoCard className="flex flex-col gap-sm md:col-span-8">
          <Field label="Problem Title" error={errors.title?.message}>
            <input
              {...register('title')}
              placeholder="e.g., Decentralized Academic Record Verification"
              className={INPUT}
              aria-invalid={!!errors.title}
            />
          </Field>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <Field label="Domain">
              <select {...register('department')} className={INPUT} aria-invalid={!!errors.department}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Short Summary" error={errors.summary?.message}>
              <input
                {...register('summary')}
                placeholder="A one-sentence hook for students"
                className={INPUT}
                aria-invalid={!!errors.summary}
              />
            </Field>
          </div>
          <Field label="Detailed Statement" error={errors.statement?.message}>
            <textarea
              {...register('statement')}
              rows={4}
              placeholder="Describe the problem, the context, and why it needs solving..."
              className={cn(INPUT, 'resize-none')}
              aria-invalid={!!errors.statement}
            />
          </Field>
          <Field label="Difficulty">
            <select {...register('difficulty')} className={INPUT}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </BentoCard>

        {/* Readiness Score */}
        <BentoCard className="flex flex-col items-center gap-sm border-dashed text-center md:col-span-4">
          <ReadinessRing pct={readiness} />
          <div>
            <p className="text-label-md font-bold uppercase tracking-wider text-on-surface">Readiness Score</p>
            <p className="text-body-md text-on-surface-variant">
              {readiness === 100 ? 'Ready to publish.' : `Complete ${missing.length} more field${missing.length === 1 ? '' : 's'} to reach 100%.`}
            </p>
          </div>
          {missing.length > 0 && (
            <ul className="w-full space-y-base text-left">
              {missing.slice(0, 4).map((m) => (
                <li key={m.key} className="flex items-center gap-xs text-label-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden="true">
                    radio_button_unchecked
                  </span>
                  {m.label}
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Impact & Rationale */}
        <SectionCard title="Why this matters" className="md:col-span-6">
          <Field label="Current Challenge">
            <textarea
              {...register('currentChallenge')}
              rows={2}
              placeholder="What is wrong with the current status quo?"
              className={INPUT}
            />
          </Field>
          <Field label="Expected Impact">
            <textarea
              {...register('expectedImpact')}
              rows={2}
              placeholder="What does success look like?"
              className={INPUT}
            />
          </Field>
        </SectionCard>

        {/* Requirement Builder */}
        <SectionCard title="Requirements" className="md:col-span-6">
          <Field label="Required Skills" error={errors.skills?.message}>
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <TagInput value={field.value} onChange={field.onChange} placeholder="Add skill..." tone="primary" />
              )}
            />
          </Field>
          <Field label="Stack / Tools">
            <Controller
              control={control}
              name="tools"
              render={({ field }) => (
                <TagInput value={field.value} onChange={field.onChange} placeholder="Add tool..." tone="tertiary" />
              )}
            />
          </Field>
        </SectionCard>

        {/* Team Dynamics + Milestones */}
        <div className="flex flex-col gap-md md:col-span-5">
          <BentoCard className="flex flex-col gap-sm">
            <h3 className="mb-xs text-label-md font-bold uppercase text-on-surface">Team Dynamics</h3>
            <Controller
              control={control}
              name="teamSize"
              render={({ field }) => (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-body-md text-on-surface">Team Size</span>
                    <span className="text-label-md font-bold text-secondary">
                      {watch('allowIndividualEntry') ? 1 : 2} – {field.value} Members
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    aria-label="Maximum team size"
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-outline-variant accent-secondary"
                  />
                </>
              )}
            />
            <Controller
              control={control}
              name="allowIndividualEntry"
              render={({ field }) => (
                <div className="mt-xs flex items-center justify-between">
                  <span className="text-body-md text-on-surface">Allow Individual Entry</span>
                  <Toggle checked={field.value} onChange={field.onChange} label="Allow individual entry" />
                </div>
              )}
            />
          </BentoCard>

          <BentoCard>
            <h3 className="mb-md text-label-md font-bold uppercase text-on-surface">Milestones</h3>
            <div className="relative space-y-md">
              <div className="absolute bottom-2 left-[9px] top-2 w-0.5 bg-outline-variant" aria-hidden="true" />
              <Milestone active label="Registration Open" error={errors.registrationDate?.message}>
                <input type="date" {...register('registrationDate')} className={cn(INPUT, 'py-base')} aria-label="Registration open date" />
              </Milestone>
              <Milestone label="Final Submission" error={errors.deadlineDate?.message}>
                <input type="date" {...register('deadlineDate')} className={cn(INPUT, 'py-base')} aria-label="Final submission date" />
              </Milestone>
            </div>
          </BentoCard>
        </div>

        {/* Incentive & Evaluation (informational) */}
        <div className="flex flex-col gap-md md:col-span-7">
          <BentoCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between bg-primary-container px-md py-sm text-on-primary-container">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
                <h3 className="text-label-md font-bold uppercase">Credit Engine Config</h3>
              </div>
              <span className="text-label-md">v2.1 ACTIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-md p-md">
              <Field label="Base Credits" error={errors.baseCredits?.message}>
                <div className="flex items-baseline gap-xs">
                  <input
                    type="number"
                    {...register('baseCredits', { valueAsNumber: true })}
                    className={cn(INPUT, 'w-24')}
                    aria-invalid={!!errors.baseCredits}
                  />
                  <span className="text-label-md text-on-surface-variant">CR</span>
                </div>
              </Field>
              <div>
                <span className={LABEL}>Difficulty Multiplier</span>
                <p className="mt-base text-headline-sm font-bold text-secondary">{MULTIPLIER[values.difficulty].toFixed(2)}x</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="mb-md text-label-md font-bold uppercase text-on-surface">Evaluation Weightage</h3>
            <div className="space-y-sm">
              <WeightBar label="Innovation & Novelty" pct={40} className="bg-secondary" />
              <WeightBar label="Technical Implementation" pct={30} className="bg-surface-tint" />
              <WeightBar label="Impact Potential" pct={30} className="bg-outline" />
            </div>
            <div className="mt-md flex items-center justify-between border-t border-outline-variant pt-sm">
              <span className="text-label-md uppercase text-on-surface-variant">Total Weightage</span>
              <span className="text-label-md font-black text-on-surface">100%</span>
            </div>
          </BentoCard>
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 z-20 -mx-md border-t border-outline-variant bg-surface/85 px-md py-sm backdrop-blur-md md:col-span-12 md:-mx-lg md:px-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="hidden items-center gap-xs sm:flex">
              <span className={cn('material-symbols-outlined', missing.length ? 'text-outline' : 'text-[#1e7a3d]')} aria-hidden="true">
                {missing.length ? 'info' : 'check_circle'}
              </span>
              <p className="text-body-md text-on-surface-variant">
                {missing.length ? `Fields missing: ${missing.length}` : 'All required fields complete'}
              </p>
            </div>
            <div className="flex w-full gap-sm sm:w-auto">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={submitting}
                className="flex-1 rounded-xl border border-outline-variant px-lg py-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50 sm:flex-none"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary px-lg py-sm font-bold text-on-primary shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 sm:flex-none"
              >
                {submitting ? 'Publishing…' : 'Publish Problem'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

/* ---------- local presentation helpers ---------- */

const BANNER_TONE = {
  success: 'bg-[#e6f4ea] text-[#1e7a3d]',
  info: 'bg-secondary-container/20 text-secondary',
  error: 'bg-error-container text-on-error-container',
}

function Banner({
  tone,
  icon,
  onClose,
  children,
}: {
  tone: keyof typeof BANNER_TONE
  icon: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className={cn('mb-md flex items-center gap-sm rounded-xl px-md py-sm text-body-md', BANNER_TONE[tone])} role="status">
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="flex items-center opacity-70 hover:opacity-100">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}

function BentoCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm', className)}>
      {children}
    </div>
  )
}

function SectionCard({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm', className)}>
      <div className="border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="text-label-md font-bold uppercase text-on-surface">{title}</h3>
      </div>
      <div className="flex flex-col gap-sm p-md">{children}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-xs">
      <span className={LABEL}>{label}</span>
      {children}
      {error ? (
        <span className="text-label-md text-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

function Milestone({ label, active, error, children }: { label: string; active?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="relative flex items-start gap-md">
      <div
        className={cn('z-10 mt-1 h-5 w-5 shrink-0 rounded-full border-4 border-surface-container-lowest', active ? 'bg-primary' : 'bg-outline-variant')}
        aria-hidden="true"
      />
      <div className="flex-grow">
        <p className="text-label-md font-bold text-on-surface">{label}</p>
        {children}
        {error ? (
          <span className="text-label-md text-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function ReadinessRing({ pct }: { pct: number }) {
  return (
    <div className="relative h-28 w-28">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" className="stroke-surface-container-high" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${pct}, 100`}
          className="stroke-primary transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-headline-md font-bold text-primary">{pct}</span>
        <span className="text-label-md text-on-surface-variant">/ 100</span>
      </div>
    </div>
  )
}

function WeightBar({ label, pct, className }: { label: string; pct: number; className: string }) {
  return (
    <div>
      <div className="mb-base flex justify-between">
        <span className="text-body-md text-on-surface">{label}</span>
        <span className="text-label-md font-bold text-on-surface">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className={cn('h-full rounded-full', className)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-10 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
        checked ? 'bg-primary-container' : 'bg-outline-variant',
      )}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  )
}
