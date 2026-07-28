/**
 * Campus Impact — headline metrics on a dark bar. Shared Landing/About.
 * Reads the same campus-impact aggregate as the Innovation Hub, so the numbers
 * can never drift between pages.
 */
import { useAsync } from '@/hooks/useAsync'
import { analyticsService } from '@/services/catalog.service'
import type { NameValue } from '@/types/domain'

export function CampusImpactStats() {
  const { data } = useAsync<NameValue[]>(() => analyticsService.campusImpact())
  const stats = data ?? []

  if (stats.length === 0) return null

  return (
    <section className="bg-primary py-xl text-on-primary">
      <div className="no-scrollbar mx-auto max-w-container-max overflow-x-auto px-md">
        <div className="flex min-w-max justify-between gap-xl md:min-w-0">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="mb-xs font-display text-headline-lg-mobile md:text-headline-lg">
                {s.value.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md uppercase text-on-primary-container">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
