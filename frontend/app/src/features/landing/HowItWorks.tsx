/** "How CRCE OS Works" — six liquid-glass lifecycle steps. Shared Landing/About. */
const STEPS = [
  { icon: 'search', label: 'Discover' },
  { icon: 'groups', label: 'Collaborate' },
  { icon: 'build', label: 'Build' },
  { icon: 'payments', label: 'Earn' },
  { icon: 'folder_shared', label: 'Portfolio' },
  { icon: 'trending_up', label: 'Impact' },
]

export function HowItWorks() {
  return (
    <div className="py-lg">
      <h3 className="mb-lg text-center font-headline-lg text-headline-lg">How CRCE OS Works</h3>
      <div className="grid grid-cols-2 gap-lg md:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="group relative flex cursor-pointer flex-col items-center justify-center p-md transition-transform duration-300 hover:scale-105"
          >
            <div className="liquid-glass absolute inset-0 rounded-xl" />
            <div className="relative z-10 flex flex-col items-center gap-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {step.icon}
                </span>
              </div>
              <div className="font-bold text-on-surface transition-colors group-hover:text-secondary">
                {step.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
