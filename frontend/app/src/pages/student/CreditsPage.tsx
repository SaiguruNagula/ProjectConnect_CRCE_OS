/**
 * Credits (Credit Engine surface). Shows the credit breakdown, how credits are
 * earned (rules), and the transaction history. The Credit Engine is the single
 * source of truth (DECISIONS.md §10); this page only displays its output.
 */
import { useAsync } from '@/hooks/useAsync'
import { creditsService } from '@/services/catalog.service'
import type { CreditRule, CreditTransaction, NameValue } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MiniBarChart } from '@/components/common/MiniBarChart'
import { PageLoader } from '@/components/feedback/LoadingBoundary'

export function CreditsPage() {
  const breakdown = useAsync<NameValue[]>(() => creditsService.breakdown())
  const rules = useAsync<CreditRule[]>(() => creditsService.rules())
  const history = useAsync<CreditTransaction[]>(() => creditsService.history())

  const total = (history.data ?? []).reduce((sum, t) => sum + t.points, 0)

  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title="Credits" subtitle="Recognition earned from verified contributions." />

      <div className="grid gap-lg lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-base">
          <span className="text-4xl font-semibold text-secondary">{total.toLocaleString()}</span>
          <span className="text-sm text-on-surface-variant">credits this period</span>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-md text-base font-semibold text-on-surface">Breakdown by source</h2>
          {breakdown.data ? <MiniBarChart data={breakdown.data} /> : <PageLoader />}
        </Card>
      </div>

      <div className="grid gap-lg lg:grid-cols-2">
        {/* Rules */}
        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">How credits are earned</h2>
          <ul className="flex flex-col divide-y divide-outline-variant">
            {rules.data?.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-sm py-xs">
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-on-surface">{r.source}</span>
                  <span className="text-xs text-on-surface-variant">{r.description}</span>
                </span>
                <Badge tone="primary">+{r.points}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* History */}
        <Card className="flex flex-col gap-sm">
          <h2 className="text-base font-semibold text-on-surface">Recent history</h2>
          <ul className="flex flex-col divide-y divide-outline-variant">
            {history.data?.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-sm py-xs">
                <span className="flex flex-col">
                  <span className="text-sm text-on-surface">{t.description}</span>
                  <span className="text-xs text-on-surface-variant">{t.source} · {t.date}</span>
                </span>
                <span className="text-sm font-semibold text-[#1e7a3d]">+{t.points}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
