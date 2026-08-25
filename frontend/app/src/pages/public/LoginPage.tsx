/**
 * Public login — the authentication gateway
 * (crce_os_authentication_gateway_connected). Two-column layout: hero + campus
 * flow on the left, credential card on the right. The top nav and footer are
 * provided by the shared SiteLayout.
 *
 * Credentials go to the backend, which answers with the user's role, and that
 * role decides the workspace to land in — the page never picks one. The role
 * names below the form are the prototype's tagline, not a way in.
 */
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HOME } from '@/constants/navigation'

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

const ROLE_LABELS = ['Student', 'Faculty', 'Administration', 'Leadership']

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
  const { user: signedIn, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in — the login page is not a place to be, and showing it to
  // someone with a live session is what made the session look dead.
  if (signedIn) return <Navigate to={ROLE_HOME[signedIn.role]} replace />

  // Set by the route guard when it turned an anonymous visitor away.
  const from = (location.state as { from?: string } | null)?.from

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(from ?? ROLE_HOME[user.role], { replace: true })
    } catch (err: unknown) {
      // The backend's own message ("Invalid email or password.") — this page
      // does not guess why a sign-in failed.
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@crce.org.in"
                    className="input-focus-ring w-full rounded-lg border border-outline-variant bg-white px-md py-[10px] font-body-md transition-all placeholder:text-outline"
                  />
                </div>

                <div className="space-y-xs">
                  {/* ponytail: no "Forgot password?" link — password reset needs
                      the auth backend. Add it with the real auth phase. */}
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-xs rounded-lg bg-error-container/30 p-sm font-body-md text-error"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      error
                    </span>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-[10px] font-headline-sm text-white transition-all hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Signing in…' : 'Login'}
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>

                <p className="pt-xs text-center text-[10px] uppercase tracking-widest text-outline">
                  {ROLE_LABELS.join(' • ')}
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

              {/* Campus SSO has no backend yet, so the button says so rather
                  than signing anyone in. */}
              <button
                type="button"
                disabled
                title="Campus Single Sign-On is not available yet."
                className="flex w-full cursor-not-allowed items-center justify-center gap-sm rounded-lg border border-outline-variant bg-white py-[10px] font-body-md text-primary opacity-50"
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
