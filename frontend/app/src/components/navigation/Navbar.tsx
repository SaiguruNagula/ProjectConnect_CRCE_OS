/**
 * Public top navigation. Config-driven (PUBLIC_NAV); highlights the active
 * route. Appearance follows the approved Stitch prototypes; do not restyle.
 */
import { NavLink, Link } from 'react-router-dom'
import { PUBLIC_NAV } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import { Brand } from '@/components/navigation/Brand'
import { cn } from '@/utils/cn'

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-container-max items-center justify-between px-md">
        <Brand />
        <ul className="hidden items-center gap-lg md:flex">
          {PUBLIC_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors hover:text-on-surface',
                    isActive ? 'text-secondary' : 'text-on-surface-variant',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <Link
          to={ROUTES.PUBLIC.LOGIN}
          className="rounded-lg bg-primary px-md py-xs text-sm font-medium text-on-primary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Log in
        </Link>
      </nav>
    </header>
  )
}
