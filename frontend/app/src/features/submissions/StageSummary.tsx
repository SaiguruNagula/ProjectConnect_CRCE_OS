/**
 * Read-only view of a submitted stage. Once a stage is with faculty the student
 * sees exactly what was sent, not an editable form. Empty fields are dropped so
 * the record reads as a submission rather than a half-filled template.
 */
import { EmptyState } from '@/components/ui/EmptyState'

export interface SummaryRow {
  label: string
  value?: string | string[]
  /** Render the value(s) as links rather than text. */
  link?: boolean
}

export function StageSummary({ rows, emptyMessage }: { rows: SummaryRow[]; emptyMessage: string }) {
  const filled = rows.filter((row) =>
    Array.isArray(row.value) ? row.value.length > 0 : Boolean(row.value?.trim()),
  )

  if (filled.length === 0) {
    return <EmptyState icon="draft" title={emptyMessage} />
  }

  return (
    <dl className="flex flex-col gap-md">
      {filled.map((row) => (
        <div key={row.label} className="flex flex-col gap-base">
          <dt className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            {row.label}
          </dt>
          <dd className="text-body-md leading-relaxed text-on-surface">
            {row.link ? (
              <ul className="flex flex-col gap-base">
                {(Array.isArray(row.value) ? row.value : [row.value ?? '']).map((href) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-xs break-all font-medium text-secondary hover:underline"
                    >
                      {href}
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        open_in_new
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : Array.isArray(row.value) ? (
              row.value.join(', ')
            ) : (
              <span className="whitespace-pre-line">{row.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
