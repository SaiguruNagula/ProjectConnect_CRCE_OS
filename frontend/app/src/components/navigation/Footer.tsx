/** Public footer. Static; content mirrors the Stitch landing prototype. */
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-sm px-md py-lg text-sm text-on-surface-variant md:flex-row">
        <p>© {new Date().getFullYear()} CRCE OS — Where Ideas Become Impact.</p>
        <nav className="flex items-center gap-md" aria-label="Footer">
          <Link to={ROUTES.PUBLIC.ABOUT} className="hover:text-on-surface">
            About
          </Link>
          <Link to={ROUTES.SHARED.OPEN_PROBLEMS} className="hover:text-on-surface">
            Open Problems
          </Link>
          <Link to={ROUTES.SHARED.LEADERBOARD} className="hover:text-on-surface">
            Leaderboard
          </Link>
        </nav>
      </div>
    </footer>
  )
}
