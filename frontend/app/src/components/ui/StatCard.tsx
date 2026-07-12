import type { DashboardStats } from '@/types/domain'
import { Card } from '@/components/ui/Card'

/** Dashboard statistic tile (UI_UX_GUIDELINES §21). */
export function StatCard({ label, value, delta, icon }: DashboardStats) {
  return (
    <Card className="flex items-start justify-between">
      <div className="flex flex-col gap-base">
        <span className="text-sm text-on-surface-variant">{label}</span>
        <span className="text-2xl font-semibold text-on-surface">{value}</span>
        {delta && <span className="text-xs text-on-surface-variant">{delta}</span>}
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container/20 text-secondary">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
          {icon}
        </span>
      </span>
    </Card>
  )
}
