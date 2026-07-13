/**
 * "SaaS Launched" success stories. Image areas use a themed placeholder rather
 * than remote images (no external image dependency in production).
 */
const STORIES = [
  { icon: 'restaurant', title: 'Smart Canteen Payment', body: 'Reduced queue times by 40% through NFC-based student wallets.', team: 'Team Alpha', impact: 'Impact: Operational' },
  { icon: 'menu_book', title: 'CRCE Library Bot', body: 'AI-powered assistant handling 500+ book queries daily.', team: 'Coders Hub', impact: 'Impact: Support' },
  { icon: 'diversity_3', title: 'Alumni Portal 2.0', body: 'Connected 2000+ alumni for internship referrals and mentorship.', team: 'WebDev Collective', impact: 'Impact: Network' },
]

export function SaasLaunched() {
  return (
    <section className="bg-surface-container-low px-md py-xl">
      <div className="mx-auto max-w-container-max">
        <h2 className="mb-lg text-center font-headline-lg text-headline-lg">SaaS Launched</h2>
        <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
          {STORIES.map((s) => (
            <div key={s.title} className="stripe-border flex flex-col rounded-xl bg-white p-lg">
              <div className="mb-md">
                <div className="mb-md flex h-48 w-full items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100">
                  <span className="material-symbols-outlined text-[48px] text-secondary" aria-hidden="true">
                    {s.icon}
                  </span>
                </div>
                <h4 className="mb-xs font-headline-sm text-headline-sm">{s.title}</h4>
                <p className="mb-md font-body-md text-on-surface-variant">{s.body}</p>
              </div>
              <div className="mt-auto border-t border-outline-variant pt-md">
                <div className="flex justify-between font-label-md text-label-md text-on-surface-variant">
                  <span>{s.team}</span>
                  <span>{s.impact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
