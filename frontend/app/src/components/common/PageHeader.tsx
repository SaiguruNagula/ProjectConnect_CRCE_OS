/**
 * Reusable page header (UI_UX_GUIDELINES §33 templates): title, optional
 * subtitle, and an optional actions slot on the right.
 */
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-sm border-b border-outline-variant pb-md md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-base">
        <h1 className="text-2xl font-semibold text-on-surface">{title}</h1>
        {subtitle && <p className="text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-sm">{actions}</div>}
    </div>
  )
}
