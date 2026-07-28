/** Open Problems catalog card — ported from the approved Stitch prototype. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Problem, Difficulty, ProblemStatus } from '@/types/domain'
import { buildPath, ROUTES } from '@/constants/routes'
import { daysLeft } from '@/utils/date'

const DIFFICULTY_CHIP: Record<Difficulty, string> = {
  Beginner: 'bg-green-50 text-green-800',
  Intermediate: 'bg-yellow-50 text-yellow-800',
  Advanced: 'bg-red-50 text-red-800',
}

const STATUS_CHIP: Record<ProblemStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-50 text-green-800' },
  in_progress: { label: 'Building Team', className: 'bg-blue-50 text-blue-800' },
  closed: { label: 'Closed', className: 'bg-surface-container-high text-on-surface-variant' },
}

/** Whole days until `endDate` (negative once past). */
function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden="true">
        {icon}
      </span>
      {children}
    </div>
  )
}

function Deadline({ problem }: { problem: Problem }) {
  if (problem.status === 'closed') {
    return (
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>
        <span className="text-label-md font-medium">Closed</span>
      </div>
    )
  }
  const days = daysLeft(problem.endDate)
  const critical = days <= 7
  const urgent = days <= 15
  return (
    <div
      className={
        critical
          ? 'flex animate-pulse items-center gap-2 font-bold text-error'
          : `flex items-center gap-2 ${urgent ? 'text-error' : 'text-on-surface-variant'}`
      }
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {critical ? 'priority_high' : 'schedule'}
      </span>
      <span className="text-label-md font-medium">{days} Days Left</span>
    </div>
  )
}

export function ProblemCard({ problem }: { problem: Problem }) {
  const status = STATUS_CHIP[problem.status]
  return (
    <div className="flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] md:p-lg">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="rounded-md bg-surface-container-high px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
          Dept: {problem.department}
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          {problem.bookmarked && (
            <span
              className="material-symbols-outlined text-[18px] text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
              title="Saved"
              aria-label="Saved"
            >
              bookmark
            </span>
          )}
          <span className={`rounded-md px-2 py-1 text-label-md font-medium ${DIFFICULTY_CHIP[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
          <span className={`rounded-md px-2 py-1 text-label-md font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
      </div>

      <h3 className="mb-1 text-headline-sm text-primary">{problem.title}</h3>
      <p className="mb-6 text-body-md text-on-surface-variant">{problem.summary}</p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <InfoRow icon="person">
          <span className="text-body-md text-on-surface">{problem.facultyName}</span>
        </InfoRow>
        <InfoRow icon="payments">
          <span className="font-mono text-body-md font-medium text-secondary">{problem.creditReward} Credits</span>
        </InfoRow>
        <InfoRow icon="group">
          <span className="text-body-md text-on-surface">
            {problem.currentTeamCount}/{problem.teamSize} Team Members
          </span>
        </InfoRow>
        <InfoRow icon="description">
          <span className="text-body-md text-on-surface">{problem.applicantsCount} Applicants</span>
        </InfoRow>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/30 pt-6">
        <Deadline problem={problem} />
        <Link
          to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problem.id })}
          className="rounded-lg bg-primary px-6 py-2 text-body-md font-medium text-on-primary transition-all hover:opacity-90 active:scale-[0.98]"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
