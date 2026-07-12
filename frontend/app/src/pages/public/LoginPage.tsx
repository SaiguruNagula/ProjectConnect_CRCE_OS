/**
 * Demo login. Pick a role to sign in as a representative user and land on that
 * role's dashboard. No password/token — real auth replaces this later.
 */
import { useNavigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_USERS, DEMO_ROLES, initials } from '@/mocks/users'
import { ROUTES } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

const ROLE_META: Record<Role, { icon: string; blurb: string }> = {
  student: { icon: 'school', blurb: 'Discover problems, build projects, earn credits.' },
  faculty: { icon: 'cast_for_education', blurb: 'Publish problems, mentor teams, review work.' },
  admin: { icon: 'admin_panel_settings', blurb: 'Manage users, monitor the platform.' },
  principal: { icon: 'insights', blurb: 'Institution-wide innovation analytics.' },
}

const ROLE_HOME: Record<Role, string> = {
  student: ROUTES.STUDENT.DASHBOARD,
  faculty: ROUTES.FACULTY.DASHBOARD,
  admin: ROUTES.ADMIN.DASHBOARD,
  principal: ROUTES.PRINCIPAL.DASHBOARD,
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const signIn = (role: Role) => {
    login(role)
    navigate(ROLE_HOME[role], { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center gap-lg px-md py-xl">
      <div className="flex flex-col items-center gap-xs text-center">
        <h1 className="text-3xl font-semibold text-on-surface">Welcome to CRCE OS</h1>
        <p className="text-sm text-on-surface-variant">
          Choose a role to explore the platform. Demo mode — no password required.
        </p>
      </div>

      <div className="grid gap-md sm:grid-cols-2">
        {DEMO_ROLES.map((role) => {
          const user = DEMO_USERS[role]
          const meta = ROLE_META[role]
          return (
            <Card key={role} className="p-0">
              <button
                type="button"
                onClick={() => signIn(role)}
                className="flex w-full items-center gap-sm rounded-xl p-md text-left transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                <Avatar initials={initials(user.name)} size="lg" />
                <span className="flex flex-1 flex-col gap-base">
                  <span className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="font-semibold capitalize text-on-surface">{role}</span>
                  </span>
                  <span className="text-sm text-on-surface-variant">{user.name}</span>
                  <span className="text-xs text-on-surface-variant">{meta.blurb}</span>
                </span>
                <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
