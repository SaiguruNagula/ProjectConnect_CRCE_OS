/** Campus Impact — headline metrics on a dark bar. Shared Landing/About. */
const STATS = [
  { value: '124+', label: 'Problems Solved' },
  { value: '82', label: 'Projects Built' },
  { value: '45', label: 'Faculty Mentors' },
  { value: '600+', label: 'Students' },
  { value: '420', label: 'Credits Earned' },
]

export function CampusImpactStats() {
  return (
    <section className="bg-primary py-xl text-on-primary">
      <div className="no-scrollbar mx-auto max-w-container-max overflow-x-auto px-md">
        <div className="flex min-w-max justify-between gap-xl md:min-w-0">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="mb-xs font-display text-headline-lg-mobile md:text-headline-lg">{s.value}</span>
              <span className="font-label-md text-label-md uppercase text-on-primary-container">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
