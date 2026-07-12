/** Minimal CSS bar chart — no chart library (YAGNI for the demo). */
interface Datum {
  label: string
  value: number
}

export function MiniBarChart({ data }: { data: Datum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex h-40 items-end gap-sm" role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-base">
          <div
            className="w-full rounded-t bg-secondary/80"
            style={{ height: `${Math.round((d.value / max) * 100)}%` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-xs text-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
