/**
 * Public login — the authentication gateway
 * (crce_os_authentication_gateway_connected). Two-column layout: hero + campus
 * flow on the left, credential card on the right. The top nav and footer are
 * provided by the shared PublicLayout.
 *
 * Auth is still the DEMO implementation: credentials are not verified. The
 * primary Login button and each role link sign in as a representative user for
 * that role and route to its workspace, matching the prototype's link mapping
 * (Login → Student). Real JWT auth replaces the handlers in the auth phase;
 * the useAuth() contract stays the same.
 */
import { useNavigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

const ROLE_HOME: Record<Role, string> = {
  student: ROUTES.STUDENT.DASHBOARD,
  faculty: ROUTES.FACULTY.DASHBOARD,
  admin: ROUTES.ADMIN.DASHBOARD,
  principal: ROUTES.PRINCIPAL.DASHBOARD,
}

const FEATURES: { icon: string; label: string }[] = [
  { icon: 'lock', label: 'Secure Authentication' },
  { icon: 'target', label: 'Automatic Workspace Personalization' },
  { icon: 'account_balance', label: 'Unified Campus Platform' },
]

const FLOW: { icon: string; title: string; desc: string }[] = [
  { icon: 'search', title: 'Discover', desc: 'Find verified campus problems.' },
  { icon: 'groups', title: 'Collaborate', desc: 'Build solutions with peers and faculty.' },
  { icon: 'engineering', title: 'Create', desc: 'Turn ideas into real projects.' },
  { icon: 'stars', title: 'Earn Recognition', desc: 'Build your portfolio and campus impact.' },
]

const ROLE_LINKS: { label: string; role: Role }[] = [
  { label: 'Student', role: 'student' },
  { label: 'Faculty', role: 'faculty' },
  { label: 'Administration', role: 'admin' },
  { label: 'Leadership', role: 'principal' },
]

function WorkspaceCard() {
  return (
    <div className="max-w-md space-y-xs rounded-xl border border-outline-variant/20 bg-surface-container-low/30 p-md">
      <h3 className="font-headline-sm text-headline-sm text-primary">CRCE OS Workspace</h3>
      <p className="font-label-md text-secondary">One Platform. Multiple Perspectives.</p>
      <p className="font-body-md text-on-surface-variant">
        Students build. Faculty mentor. Administration manages. Leadership measures impact.
      </p>
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const signIn = (role: Role) => {
    login(role)
    navigate(ROLE_HOME[role], { replace: true })
  }

  // Demo: credentials are not verified; the primary Login mirrors the prototype
  // and signs in as a student.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    signIn('student')
  }

  return (
    <>
      <div className="px-md pb-xl pt-xl">
        <div className="mx-auto grid max-w-container-max items-center gap-xl lg:grid-cols-12">
          {/* Left: hero, features, campus flow */}
          <div className="space-y-xl lg:col-span-6">
            <div className="space-y-md">
              <h1 className="max-w-lg font-display text-display text-primary">
                Welcome Back. Continue Building
                <br />
                Campus Impact.
              </h1>
              <p className="max-w-md font-body-lg text-body-lg text-on-surface-variant">
                Solve meaningful problems, collaborate across departments, build real projects, and
                create measurable impact.
              </p>
              <div className="flex flex-col gap-sm pt-sm">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-center gap-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/10">
                      <span className="material-symbols-outlined text-[14px] font-bold text-secondary" aria-hidden="true">
                        {f.icon}
                      </span>
                    </div>
                    <span className="font-body-md text-on-surface">{f.label}</span>
                  </div>
                ))}
                <p className="pt-xs text-label-md text-on-surface-variant">
                  Sign in once. CRCE OS automatically prepares your workspace based on your campus role.
                </p>
              </div>
            </div>

            {/* Campus flow */}
            <div className="relative space-y-md">
              <div className="absolute bottom-4 left-[20px] top-4 hidden w-px bg-outline-variant/30 md:block" />
              {FLOW.map((step) => (
                <div key={step.title} className="group flex items-start gap-md">
                  <div className="z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high linear-shadow transition-transform group-hover:scale-105">
                    <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                      {step.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline-sm text-headline-sm">{step.title}</p>
                    <p className="font-body-md text-on-surface-variant">{step.desc}</p>
                  </div>
                </div>
              ))}
              <div className="pt-md">
                <div className="flex max-w-sm items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-low/50 p-sm text-label-md text-outline">
                  {['Discover', 'Collaborate', 'Build', 'Earn'].map((label) => (
                    <span key={label} className="flex items-center gap-xs">
                      {label}
                      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                        arrow_downward
                      </span>
                    </span>
                  ))}
                  <span>Impact</span>
                </div>
              </div>
            </div>

            <WorkspaceCard />
          </div>

          {/* Right: credential card */}
          <div className="flex justify-center lg:col-span-6 lg:justify-end">
            <div className="w-full max-w-[440px] space-y-md rounded-xl border border-outline-variant/30 bg-white p-lg linear-shadow">
              <div className="space-y-xs pb-sm">
                <h2 className="font-headline-md text-headline-md text-primary">Login to CRCE OS</h2>
                <p className="font-body-md text-on-surface-variant">
                  Enter your campus credentials to proceed.
                </p>
              </div>

              <form className="space-y-md" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@crce.org.in"
                    className="input-focus-ring w-full rounded-lg border border-outline-variant bg-white px-md py-[10px] font-body-md transition-all placeholder:text-outline"
                  />
                </div>

                <div className="space-y-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">
                      Password
                    </label>
                    <button type="button" className="font-label-md text-label-md text-secondary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-focus-ring w-full rounded-lg border border-outline-variant bg-white px-md py-[10px] font-body-md transition-all placeholder:text-outline"
                  />
                </div>

                <div className="flex items-center gap-xs">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary/20"
                  />
                  <label className="select-none font-body-md text-on-surface-variant" htmlFor="remember">
                    Remember me for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-[10px] font-headline-sm text-white transition-all hover:bg-black/90 active:scale-[0.98]"
                >
                  Login
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>

                <p className="pt-xs text-center text-[10px] uppercase tracking-widest text-outline">
                  {ROLE_LINKS.map((link, i) => (
                    <span key={link.role}>
                      {i > 0 && ' • '}
                      <button
                        type="button"
                        onClick={() => signIn(link.role)}
                        className="uppercase transition-colors hover:text-primary"
                      >
                        {link.label}
                      </button>
                    </span>
                  ))}
                  {' | One Platform. Personalized Experience.'}
                </p>
              </form>

              <div className="relative py-sm">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/30" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-md font-label-md text-outline">OR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signIn('student')}
                className="flex w-full items-center justify-center gap-sm rounded-lg border border-outline-variant bg-white py-[10px] font-body-md text-primary transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                  school
                </span>
                Campus Single Sign-On
              </button>

              <div className="border-t border-outline-variant/30 pt-md text-center">
                <p className="flex items-center justify-center gap-xs font-mono text-mono text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    info
                  </span>
                  After sign in, CRCE OS automatically prepares your personalized workspace.
                </p>
              </div>
            </div>

            <WorkspaceCard />
          </div>
        </div>
      </div>

      {/* Security strip */}
      <div className="w-full border-y border-outline-variant/20 bg-surface-container-low/50 py-sm">
        <div className="mx-auto flex max-w-container-max flex-wrap items-center justify-center gap-md px-lg font-mono text-mono text-on-surface-variant opacity-70 md:justify-between">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>
            Secure Campus Authentication
          </div>
          <div className="hidden items-center gap-sm md:flex">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">badge</span>
            Role-based Access
          </div>
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">encrypted</span>
            Protected Data
          </div>
        </div>
      </div>
    </>
  )
}
