/**
 * Modal dialog built on the native <dialog> element, so focus trapping, Escape
 * and inert-background behaviour come from the platform rather than a
 * hand-rolled implementation. Backdrop clicks close it too.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** Sticky footer actions; rendered below the scrolling body. */
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export function Dialog({ open, onClose, title, description, footer, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // `cancel` covers Escape; `close` covers every other dismissal path.
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="dialog-title"
      className={cn(
        'w-[92vw] max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 text-on-surface backdrop:bg-black/40',
        className,
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-start justify-between gap-md border-b border-outline-variant px-md py-sm">
          <div>
            <h2 id="dialog-title" className="text-headline-sm font-semibold text-on-surface">
              {title}
            </h2>
            {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex shrink-0 items-center rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-md py-md">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-sm border-t border-outline-variant px-md py-sm">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}
