/** "Why CRCE OS?" — value pillars in a 2×2 grid. Shared Landing/About. */
const REASONS = [
  { title: 'Real-World Experience', body: 'Work on actual problems faced by the campus and industry partners.' },
  { title: 'Verified Skillset', body: 'Build a portfolio backed by faculty-verified project completions.' },
  { title: 'Academic Integration', body: 'Earn credits that contribute directly to your academic transcript.' },
  { title: 'Mentorship Access', body: 'Direct guidance from experienced faculty and industry experts.' },
]

export function WhyCrceOs() {
  return (
    <div className="py-lg">
      <h3 className="mb-lg text-center font-headline-lg text-headline-lg">Why CRCE OS?</h3>
      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        {REASONS.map((r) => (
          <div key={r.title} className="flex items-start gap-sm">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">
              check_circle
            </span>
            <div>
              <div className="font-bold">{r.title}</div>
              <p className="text-body-md text-on-surface-variant">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
