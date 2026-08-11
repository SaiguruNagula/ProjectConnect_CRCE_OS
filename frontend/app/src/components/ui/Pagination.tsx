/**
 * Page controls for a server-paginated list — Previous, the page numbers, Next.
 * Purely presentational: it is told which page is being served and how many
 * there are, and reports the page the user asked for. The page maths, clamping
 * and slicing belong to the hook and the API behind it.
 */
interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** Announced to screen readers, e.g. "Showing 1–6 of 24 problems". */
  summary?: string
}

export function Pagination({ page, totalPages, onChange, summary }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className="mt-xl flex flex-col items-center gap-xs" aria-label="Pagination">
      <div className="flex items-center gap-2">
        <Arrow
          icon="chevron_left"
          label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={
              n === page
                ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-body-md font-medium text-on-primary'
                : 'flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-body-md font-medium transition-colors hover:bg-surface-container'
            }
          >
            {n}
          </button>
        ))}
        <Arrow
          icon="chevron_right"
          label="Next page"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        />
      </div>
      {summary && (
        <p className="text-label-sm text-on-surface-variant" role="status">
          {summary}
        </p>
      )}
    </nav>
  )
}

function Arrow({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-outline-variant p-2 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}
