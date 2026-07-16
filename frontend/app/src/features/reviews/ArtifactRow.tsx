/** A submitted artifact row (shared): file icon, name, size/updated, actions. */
import type { ReviewAttachment } from '@/types/domain'
import { cn } from '@/utils/cn'

const KIND_ICON: Record<string, { icon: string; className: string }> = {
  PDF: { icon: 'picture_as_pdf', className: 'text-error' },
  ZIP: { icon: 'folder_zip', className: 'text-secondary' },
}

/** Compact relative time, e.g. "2h ago". */
function updatedLabel(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function ArtifactRow({ attachment, canPreview = false }: { attachment: ReviewAttachment; canPreview?: boolean }) {
  const meta = KIND_ICON[attachment.kind] ?? { icon: 'description', className: 'text-on-surface-variant' }
  return (
    <div className="group flex items-center justify-between rounded-xl border border-outline-variant/40 p-sm transition-colors hover:bg-surface-container-low">
      <div className="flex min-w-0 items-center gap-sm">
        <span
          className={cn('material-symbols-outlined', meta.className)}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold text-primary">{attachment.name}</p>
          <p className="text-[12px] text-outline">{attachment.size} · Updated {updatedLabel(attachment.updatedAt)}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {canPreview && (
          <button
            type="button"
            aria-label={`Preview ${attachment.name}`}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">visibility</span>
          </button>
        )}
        <button
          type="button"
          aria-label={`Download ${attachment.name}`}
          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">download</span>
        </button>
      </div>
    </div>
  )
}
