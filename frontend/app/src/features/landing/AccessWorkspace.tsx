/** "Access Your Workspace" — role login cards linking to the demo login. */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

const ROLES = [
  { icon: 'person', title: 'Student', body: 'Solve problems, track credits, and build your portfolio.' },
  { icon: 'school', title: 'Faculty', body: 'Mentor projects, post problems, and track outcomes.' },
  { icon: 'admin_panel_settings', title: 'Admin', body: 'Manage campus resources and system permissions.' },
  { icon: 'stars', title: 'Principal', body: 'High-level insights into campus innovation metrics.' },
]

export function AccessWorkspace() {
  return (
    <section className="mx-auto max-w-container-max px-md py-xl text-center">
      <h2 className="mb-lg font-headline-lg text-headline-lg">Access Your Workspace</h2>
      <div className="grid grid-cols-1 gap-md md:grid-cols-4">
        {ROLES.map((r) => (
          <Link
            key={r.title}
            to={ROUTES.PUBLIC.LOGIN}
            className="stripe-border block cursor-pointer rounded-xl bg-white p-lg transition-all hover:bg-surface-container"
          >
            <span className="material-symbols-outlined mb-sm text-[40px] text-secondary" aria-hidden="true">
              {r.icon}
            </span>
            <h3 className="mb-xs font-headline-sm text-headline-sm">{r.title}</h3>
            <p className="mb-md font-body-md text-on-surface-variant">{r.body}</p>
            <span className="font-bold text-primary hover:underline">
              Login <span className="material-symbols-outlined align-middle text-sm" aria-hidden="true">arrow_forward</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
