/**
 * Project Submissions — the student's submission journey for one project,
 * served at /student/projects/:id.
 *
 * Four stages, in order: Idea → Proof of Concept → Faculty Selection → Final
 * Project. This is a submission flow, not a project-management tool: there are
 * no boards, no tasks, no meetings and no progress arithmetic here. Stage order,
 * unlocking and status transitions are decided by useProjectJourney →
 * projectsService, so this page only chooses which stage to render.
 */
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useProjectJourney } from '@/hooks/useProjectJourney'
import { buildPath, ROUTES } from '@/constants/routes'
import type { SubmissionStage } from '@/types/domain'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { StageNav } from '@/features/submissions/StageNav'
import { IdeaStage } from '@/features/submissions/IdeaStage'
import { PocStage } from '@/features/submissions/PocStage'
import { SelectionStage } from '@/features/submissions/SelectionStage'
import { FinalStage } from '@/features/submissions/FinalStage'
import { stageMeta } from '@/features/submissions/status'

export function ProjectSubmissionsPage() {
  const { id } = useParams()
  // Set by TeamFormationPage's applySolo — a one-time onboarding note in place
  // of the popup that used to stand between applying and the Idea stage.
  const location = useLocation()
  const [welcome, setWelcome] = useState((location.state as { welcome?: string } | null)?.welcome ?? null)
  const {
    journey,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError,
    dismissMessage,
    saveIdea,
    savePoc,
    saveFinal,
  } = useProjectJourney(id)

  // null means "wherever the journey currently is" — the student can override.
  const [picked, setPicked] = useState<SubmissionStage | null>(null)

  if (loading) return <PageLoader />
  if (error || !journey) {
    return (
      <div className="mx-auto w-full max-w-container-max px-md py-lg md:px-lg">
        <EmptyState
          icon="folder_off"
          title="Project not found"
          description={error ?? 'You have no submissions yet. Apply to an open problem to start one.'}
          action={
            <Link
              to={ROUTES.SHARED.OPEN_PROBLEMS}
              className="text-label-md font-semibold text-secondary hover:underline"
            >
              Browse Open Problems
            </Link>
          }
        />
      </div>
    )
  }

  const active = picked ?? journey.currentStage
  const meta = stageMeta(active)

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg px-md py-lg md:px-lg">
      <header className="flex flex-col gap-sm">
        <nav aria-label="Breadcrumb" className="text-label-md text-on-surface-variant">
          <Link to={ROUTES.STUDENT.PROJECTS} className="font-medium text-secondary hover:underline">
            My Projects
          </Link>
          <span className="mx-xs" aria-hidden="true">/</span>
          <span>{journey.title}</span>
        </nav>
        <div className="flex items-center gap-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <span className="material-symbols-outlined" aria-hidden="true">
              grid_view
            </span>
          </span>
          <div className="leading-tight">
            <h1 className="text-headline-sm font-bold tracking-tight text-primary">{journey.title}</h1>
            <p className="flex flex-wrap items-center gap-xs text-label-md text-on-surface-variant">
              <span>Mentor · {journey.mentorName}</span>
              <span aria-hidden="true">·</span>
              <span>{journey.teamName}</span>
              {journey.problemId && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link
                    to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: journey.problemId })}
                    className="font-medium text-secondary hover:underline"
                  >
                    {journey.problemTitle ?? 'View problem'}
                  </Link>
                </>
              )}
            </p>
          </div>
          <ul className="ml-auto hidden items-center sm:flex" aria-label="Team members">
            {journey.members.map((m) => (
              <li key={m.id} className="-ml-2 first:ml-0" title={`${m.name} · ${m.role}`}>
                <Avatar initials={m.avatarInitials} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      </header>

      <StageNav journey={journey} active={active} onSelect={setPicked} />

      <ActionBanner tone="success" message={welcome} onDismiss={() => setWelcome(null)} />
      <ActionBanner tone="success" message={actionMessage} onDismiss={dismissMessage} />
      <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />

      <section className="flex flex-col gap-md" aria-label={meta.label}>
        <div className="flex flex-col gap-base">
          <h2 className="text-headline-sm font-bold text-on-surface">{meta.label}</h2>
          <p className="text-body-md text-on-surface-variant">{meta.blurb}</p>
        </div>

        {active === 'idea' && <IdeaStage journey={journey} busy={busy} onSave={saveIdea} />}
        {active === 'poc' && <PocStage journey={journey} busy={busy} onSave={savePoc} />}
        {active === 'selection' && <SelectionStage journey={journey} onOpenStage={setPicked} />}
        {active === 'final' && <FinalStage journey={journey} busy={busy} onSave={saveFinal} />}
      </section>

      <Card className="flex flex-wrap items-center gap-xs text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          info
        </span>
        Credits are awarded once your final project is approved, and the approved project appears on your
        portfolio and the leaderboard automatically.
      </Card>
    </div>
  )
}
