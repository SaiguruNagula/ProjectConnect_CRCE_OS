/**
 * Breadcrumb derived from the current path (UI_UX_GUIDELINES §19).
 * Purely presentational; segments after the first link to their accumulated path.
 */
import { Link, useLocation } from 'react-router-dom'
import { Fragment } from 'react'

function humanize(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  let accumulated = ''

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-on-surface-variant">
      <ol className="flex flex-wrap items-center gap-base">
        {segments.map((segment, index) => {
          accumulated += `/${segment}`
          const isLast = index === segments.length - 1
          return (
            <Fragment key={accumulated}>
              {index > 0 && (
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  chevron_right
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-on-surface">
                  {humanize(segment)}
                </span>
              ) : (
                <Link to={accumulated} className="hover:text-on-surface">
                  {humanize(segment)}
                </Link>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
