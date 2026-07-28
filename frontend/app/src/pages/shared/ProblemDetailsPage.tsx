/**
 * Problem details — view of one problem, ported to the approved Stitch "Problem
 * Architect" bento-card visual language. Loads by :id through useProblemDetails,
 * offers the lifecycle entry point (apply → Team Formation, carrying the problem
 * id) and links onward to the projects and solutions it produced.
 */
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProblemDetails } from '@/hooks/useProblemDetails'
import type { Difficulty, Problem, ProblemAttachment, ProblemMilestone } from '@/types/domain'
import { buildPath, QUERY_PARAMS, ROUTES, withQuery } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeProps } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { STAGE_STATUS, stageMeta } from '@/features/submissions/status'

const DIFFICULTY_META: Record<Difficulty, { blurb: string; tone: BadgeProps['tone'] }> = {
  Beginner: { blurb: 'Core fundamentals', tone: 'success' },
  Intermediate: { blurb: 'Application focus', tone: 'warning' },
  Advanced: { blurb: 'Complex engineering', tone: 'error' },
}

const STATUS_META: Record<Problem['status'], { label: string; tone: BadgeProps['tone'] }> = {
  open: { label: 'Open', tone: 'success' },
  in_progress: { label: 'Building Team', tone: 'primary' },
  closed: { label: 'Closed', tone: 'neutral' },
}

const ATTACHMENT_ICON: Record<string, string> = {
  PDF: 'picture_as_pdf',
  Dataset: 'dataset',
  PPT: 'slideshow',
}

export function ProblemDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const {
    problem,
    projects,
    solutions,
    loading,
    error,
    busy,
    actionError,
    dismissError,
    toggleBookmark,
  } = useProblemDetails(id)

  if (loading) return <PageLoader />
  if (error || !problem) {
    return (
      <div className="mx-auto max-w-container-max px-md py-lg">
        <EmptyState icon="error" title="Problem not found" description={error ?? 'This problem may have been closed.'} />
      </div>
    )
  }

  const status = STATUS_META[problem.status]
  const difficulty = DIFFICULTY_META[problem.difficulty]
  const closed = problem.status === 'closed'
  const applied =
    problem.applicationStatus && problem.applicationStatus !== 'none'
      ? problem.applicationStatus
      : null
  const teamFormationPath = withQuery(ROUTES.SHARED.TEAM_FORMATION, {
    [QUERY_PARAMS.PROBLEM]: problem.id,
  })

  return (
    <div className="mx-auto max-w-container-max px-md py-lg md:px-lg lg:px-xl">
      {/* Hero */}
      <div className="mb-8 flex flex-col gap-4">
        <Link
          to={ROUTES.SHARED.OPEN_PROBLEMS}
          className="inline-flex w-fit items-center gap-1 text-label-md font-medium text-on-surface-variant transition-colors hover:text-secondary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Open Problems
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-container-high px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            Dept: {problem.department}
          </span>
          <Badge tone={difficulty.tone}>{problem.difficulty}</Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
          {applied && <Badge tone="primary">Applied {applied === 'team' ? 'as a team' : 'solo'}</Badge>}
          <button
            type="button"
            onClick={toggleBookmark}
            disabled={busy}
            aria-pressed={problem.bookmarked}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: problem.bookmarked ? "'FILL' 1" : undefined }}
              aria-hidden="true"
            >
              bookmark
            </span>
            {problem.bookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
        <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />
        <h1 className="max-w-3xl text-headline-lg tracking-tight text-on-surface">{problem.title}</h1>
        <p className="max-w-2xl text-body-lg text-on-surface-variant">{problem.summary}</p>
      </div>

      {/* 60/40 bento grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-10">
        {/* Left column (60%) */}
        <div className="flex flex-col gap-6 lg:col-span-6">
          <SectionCard title="Problem Statement">
            <p className="text-body-md leading-relaxed text-on-surface-variant">{problem.summary}</p>
          </SectionCard>

          <SectionCard title="Skills & Requirements">
            <div className="flex flex-wrap gap-2">
              {problem.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-outline-variant bg-surface-container-highest px-2.5 py-0.5 text-label-md font-medium text-on-surface-variant"
                >
                  {skill}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Reference Material">
            {problem.attachments.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No attachments provided.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {problem.attachments.map((file) => (
                  <AttachmentRow key={file.url} file={file} />
                ))}
              </ul>
            )}
          </SectionCard>

          {projects.length > 0 && (
            <SectionCard title="Projects on this problem">
              <ul className="flex flex-col gap-2">
                {projects.map((project) => (
                  <RelatedRow
                    key={project.id}
                    icon="rocket_launch"
                    title={project.title}
                    meta={`${stageMeta(project.stage).label} · ${STAGE_STATUS[project.stageStatus].short}`}
                    to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: project.id })}
                  />
                ))}
              </ul>
            </SectionCard>
          )}

          {solutions.length > 0 && (
            <SectionCard title="Solutions shipped">
              <ul className="flex flex-col gap-2">
                {solutions.map((solution) => (
                  <RelatedRow
                    key={solution.id}
                    icon={solution.icon}
                    title={solution.name}
                    meta={solution.description}
                    to={ROUTES.SHARED.SOLUTIONS}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        {/* Right column (40%) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="border-secondary/20 bg-secondary/5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <p className="font-mono text-label-md font-bold uppercase tracking-wider text-secondary">Problem ID</p>
            <p className="mt-1 text-headline-sm font-bold text-secondary">CRCE-{problem.id.toUpperCase()}</p>
            <p className="mt-2 text-[10px] font-medium text-on-surface-variant">Reference this ID in all communications.</p>
          </Card>

          <SectionCard title="Difficulty Level">
            <div className="flex items-center gap-3 rounded-xl border border-secondary bg-secondary/5 p-4">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">bolt</span>
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-on-surface">{problem.difficulty}</span>
                <span className="text-label-sm leading-tight text-on-surface-variant">{difficulty.blurb}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Structured Timeline">
            <Timeline milestones={problem.timeline} />
          </SectionCard>

          <SectionCard title="Faculty Information">
            <div className="flex flex-col gap-4">
              <Field label="Created By" value={problem.facultyName} />
              <Field label="Department" value={problem.department} />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Team" value={`${problem.currentTeamCount}/${problem.teamSize}`} />
                <Stat label="Applicants" value={String(problem.applicantsCount)} />
              </div>
            </div>
          </SectionCard>

          <Card className="overflow-hidden !p-0 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between bg-secondary px-6 py-3 text-on-secondary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">account_balance_wallet</span>
                <h3 className="font-mono text-label-md font-bold uppercase tracking-wider">Credit Value</h3>
              </div>
            </div>
            <div className="flex flex-col items-center p-6 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">Awarded on completion</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-secondary">{problem.creditReward}</span>
                <span className="text-base font-bold text-on-surface-variant">CR</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 z-30 -mx-md mt-8 border-t border-outline-variant bg-surface/95 px-md py-4 backdrop-blur-md md:-mx-lg md:px-lg lg:-mx-xl lg:px-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-label-md">
            <span className="font-black uppercase text-on-surface-variant">Status:</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="hover:shadow-lg active:scale-[0.98]"
            onClick={() => navigate(teamFormationPath)}
            disabled={closed}
          >
            {closed ? 'Applications Closed' : applied ? 'Manage my application' : 'Apply with a team'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
      <h3 className="mb-4 font-mono text-label-md font-bold uppercase tracking-wider text-on-surface">{title}</h3>
      {children}
    </Card>
  )
}

/** A link out to an entity built from this problem (project or solution). */
function RelatedRow({
  icon,
  title,
  meta,
  to,
}: {
  icon: string
  title: string
  meta: string
  to: string
}) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-xl border border-outline-variant p-3 transition-colors hover:border-secondary hover:bg-surface-container-low"
      >
        <span className="material-symbols-outlined text-outline group-hover:text-secondary" aria-hidden="true">
          {icon}
        </span>
        <span className="flex min-w-0 flex-grow flex-col">
          <span className="truncate text-body-md font-medium text-on-surface">{title}</span>
          <span className="truncate text-label-sm text-on-surface-variant">{meta}</span>
        </span>
        <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-secondary" aria-hidden="true">
          arrow_outward
        </span>
      </Link>
    </li>
  )
}

function AttachmentRow({ file }: { file: ProblemAttachment }) {
  return (
    <li>
      <a
        href={file.url}
        className="group flex items-center gap-3 rounded-xl border border-outline-variant p-3 transition-colors hover:border-secondary hover:bg-surface-container-low"
      >
        <span className="material-symbols-outlined text-outline group-hover:text-secondary" aria-hidden="true">
          {ATTACHMENT_ICON[file.type] ?? 'description'}
        </span>
        <span className="flex-grow truncate text-body-md text-on-surface">{file.name}</span>
        <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-label-sm font-medium uppercase text-on-surface-variant">
          {file.type}
        </span>
        <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-secondary" aria-hidden="true">
          download
        </span>
      </a>
    </li>
  )
}

function Timeline({ milestones }: { milestones: ProblemMilestone[] }) {
  return (
    <div className="relative flex flex-col gap-8">
      <span className="absolute bottom-2.5 left-[9px] top-2.5 w-0.5 bg-outline-variant" aria-hidden="true" />
      {milestones.map((m) => (
        <div key={m.label} className="relative z-10 flex items-center gap-4">
          <span
            className={
              m.done
                ? 'h-5 w-5 shrink-0 rounded-full border-4 border-white bg-secondary shadow-sm'
                : 'h-5 w-5 shrink-0 rounded-full border-2 border-outline-variant bg-white shadow-sm'
            }
            aria-hidden="true"
          />
          <div className="flex flex-grow items-baseline justify-between gap-2">
            <p className="text-label-md font-bold text-on-surface">{m.label}</p>
            <p className="text-[11px] font-medium text-on-surface-variant">{m.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      <p className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-body-md text-on-surface">
        {value}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-center">
      <p className="text-headline-sm font-bold text-secondary">{value}</p>
      <p className="text-[10px] font-bold uppercase text-on-surface-variant">{label}</p>
    </div>
  )
}
