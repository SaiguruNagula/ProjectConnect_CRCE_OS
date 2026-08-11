/**
 * The submission timeline — Idea Submitted through Completed, always the same
 * steps in the same order. It replaces the old per-review history feed: there is
 * nothing to scroll and nothing to interpret, only which steps have happened.
 * The steps are composed by the repository, so this renders what it is given.
 */
import type { ReviewTimelineEvent } from '@/types/domain'
import { fmtDate } from '@/utils/date'

export function ReviewTimeline({ events }: { events: ReviewTimelineEvent[] }) {
  return (
    <ol className="flex flex-col gap-0">
      {events.map((event, i) => (
        <li key={event.status} className="relative flex gap-sm pb-md pl-1 last:pb-0">
          {i < events.length - 1 && (
            <span
              className={`absolute left-[11px] top-6 h-full w-0.5 ${
                event.done ? 'bg-secondary/40' : 'bg-outline-variant/40'
              }`}
              aria-hidden="true"
            />
          )}
          <span
            className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              event.done ? 'bg-secondary text-on-secondary' : 'border border-outline-variant bg-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={event.done ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              {event.done ? 'check' : 'radio_button_unchecked'}
            </span>
          </span>
          <div className="flex flex-col gap-base pt-base">
            <span
              className={`text-label-md font-semibold ${
                event.done ? 'text-on-surface' : 'text-on-surface-variant/60'
              }`}
            >
              {event.label}
            </span>
            {event.at && event.done && (
              <span className="font-mono text-[11px] text-on-surface-variant">{fmtDate(event.at)}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
