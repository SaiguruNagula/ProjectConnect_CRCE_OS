/**
 * Create Problem. Faculty form (React Hook Form + Zod) to publish a challenge.
 * Submits locally for the demo; swap to problemsService.create() later — the
 * form and validation stay identical.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DEPARTMENTS, DIFFICULTIES } from '@/constants/catalog'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  department: z.enum(DEPARTMENTS),
  difficulty: z.enum(DIFFICULTIES),
  teamSize: z.number({ message: 'Enter a team size' }).int().min(1).max(8),
  timelineWeeks: z.number({ message: 'Enter a timeline' }).int().min(1).max(52),
  skills: z.string().min(2, 'List at least one skill'),
  summary: z.string().min(20, 'Describe the problem in at least 20 characters'),
})

type ProblemForm = z.infer<typeof schema>

export function CreateProblemPage() {
  const [published, setPublished] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProblemForm>({ resolver: zodResolver(schema) })

  const onSubmit = (values: ProblemForm) => {
    setPublished(values.title)
    reset()
  }

  const err = (msg?: string) => (msg ? <p className="text-xs text-error" role="alert">{msg}</p> : null)
  const inputCls =
    'h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-lg">
      <PageHeader title="Create Problem" subtitle="Publish a challenge for students to solve." />

      {published && (
        <div className="flex items-center gap-xs rounded-lg bg-[#e6f4ea] px-sm py-xs text-sm text-[#1e7a3d]" role="status">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
          Problem “{published}” published.
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-sm" noValidate>
          <label className="flex flex-col gap-base text-sm">
            <span className="font-medium text-on-surface">Title</span>
            <input {...register('title')} className={inputCls} aria-invalid={!!errors.title} />
            {err(errors.title?.message)}
          </label>

          <div className="grid gap-sm sm:grid-cols-2">
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Department</span>
              <select {...register('department')} className={inputCls} aria-invalid={!!errors.department}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Difficulty</span>
              <select {...register('difficulty')} className={inputCls} aria-invalid={!!errors.difficulty}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-sm sm:grid-cols-2">
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Team size</span>
              <input type="number" {...register('teamSize', { valueAsNumber: true })} className={inputCls} aria-invalid={!!errors.teamSize} />
              {err(errors.teamSize?.message)}
            </label>
            <label className="flex flex-col gap-base text-sm">
              <span className="font-medium text-on-surface">Timeline (weeks)</span>
              <input type="number" {...register('timelineWeeks', { valueAsNumber: true })} className={inputCls} aria-invalid={!!errors.timelineWeeks} />
              {err(errors.timelineWeeks?.message)}
            </label>
          </div>

          <label className="flex flex-col gap-base text-sm">
            <span className="font-medium text-on-surface">Skills required</span>
            <input {...register('skills')} placeholder="e.g. Python, Computer Vision" className={inputCls} aria-invalid={!!errors.skills} />
            {err(errors.skills?.message)}
          </label>

          <label className="flex flex-col gap-base text-sm">
            <span className="font-medium text-on-surface">Summary</span>
            <textarea {...register('summary')} rows={4} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" aria-invalid={!!errors.summary} />
            {err(errors.summary?.message)}
          </label>

          <Button type="submit" disabled={isSubmitting} className="self-start">Publish problem</Button>
        </form>
      </Card>
    </div>
  )
}
