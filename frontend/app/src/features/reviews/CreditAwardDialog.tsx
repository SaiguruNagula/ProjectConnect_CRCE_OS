/**
 * Credits awarded after a final approval. The five components are captured
 * exactly as the Credit Engine will consume them; the total shown here is only
 * a preview — the authoritative sum is computed by the repository/API.
 */
import { useState } from 'react'
import type { CreditAward, CreditAwardInput } from '@/types/domain'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/form'

const COMPONENTS = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'bonus', label: 'Bonus Credits' },
] as const

type Values = Record<(typeof COMPONENTS)[number]['key'], number>

const EMPTY: Values = {
  innovation: 0,
  implementation: 0,
  documentation: 0,
  presentation: 0,
  bonus: 0,
}

interface CreditAwardDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  teamName: string
  /** Credits already awarded, when the faculty is revising them. */
  awarded?: CreditAward
  busy: boolean
  onAward: (input: CreditAwardInput) => Promise<boolean>
}

export function CreditAwardDialog({
  open,
  onClose,
  projectId,
  teamName,
  awarded,
  busy,
  onAward,
}: CreditAwardDialogProps) {
  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, ...awarded }))
  const [error, setError] = useState<string | null>(null)
  const total = COMPONENTS.reduce((sum, c) => sum + (values[c.key] || 0), 0)

  async function submit() {
    if (total <= 0) {
      setError('Award at least one credit before submitting.')
      return
    }
    setError(null)
    if (await onAward({ projectId, ...values })) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Award Academic Credits"
      description={`Credits for ${teamName}. The Credit Engine processes these values once submitted.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Awarding…' : `Award ${total} Credits`}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {COMPONENTS.map((component) => (
          <Field key={component.key} label={component.label}>
            <input
              type="number"
              min={0}
              step={1}
              value={values[component.key]}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  [component.key]: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className={`${inputClass} font-mono`}
            />
          </Field>
        ))}
      </div>

      <div className="mt-md flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-md">
        <span className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Total Credits
        </span>
        <span className="font-mono text-headline-sm text-primary">{total}</span>
      </div>

      {error && (
        <p className="mt-sm text-label-md text-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
