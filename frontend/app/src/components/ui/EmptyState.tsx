import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

/** Educational empty state (UI_UX_GUIDELINES §26). */
export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center">
      <span className="material-symbols-outlined text-[40px] text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      {description && <p className="max-w-sm text-sm text-on-surface-variant">{description}</p>}
      {action}
    </div>
  )
}
