/**
 * Faculty side of Stage 3 — pick which teams build the final project. Selecting
 * a team unlocks Stage 4 for them; requesting changes hands the proof of concept
 * back. The panel only renders the queue and collects the decision.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project, SelectionDecisionInput } from '@/types/domain'
import { useSelectionReview } from '@/hooks/useSelectionReview'
import { buildPath, ROUTES } from '@/constants/routes'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { textareaClass } from '@/components/ui/form'
import { STAGE_STATUS } from './status'

type Decision = SelectionDecisionInput['decision']

export function SelectionReviewPanel() {
  const { queue, loading, error, busy, actionError, actionMessage, dismissError, dismissMessage, decide } =
    useSelectionReview()

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm font-semibold text-on-surface">Final Development Selection</h2>
        {queue.length > 0 && <Badge tone="warning">{queue.length} to decide</Badge>}
      </div>

      <ActionBanner tone="success" message={actionMessage} onDismiss={dismissMessage} />
      <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <Card>
          <EmptyState icon="error" title="Couldn’t load proposals" description={error} />
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <EmptyState
            icon="how_to_reg"
            title="No proposals awaiting selection"
            description="Teams appear here once they submit a proof of concept."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-md">
          {queue.map((project) => (
            <SelectionRow key={project.id} project={project} busy={busy} onDecide={decide} />
          ))}
        </div>
      )}
    </section>
  )
}

interface SelectionRowProps {
  project: Project
  busy: boolean
  onDecide: (input: SelectionDecisionInput) => Promise<boolean>
}

function SelectionRow({ project, busy, onDecide }: SelectionRowProps) {
  const [feedback, setFeedback] = useState('')
  const [touched, setTouched] = useState(false)
  const status = STAGE_STATUS[project.stageStatus]

  const submit = async (decision: Decision) => {
    // A team that is not selected, or is sent back, always gets a reason.
    if (decision !== 'selected' && feedback.trim().length < 10) {
      setTouched(true)
      return
    }
    if (
      decision === 'not_selected' &&
      !window.confirm(`Mark ${project.title} as not selected? This ends their path to Stage 4.`)
    ) {
      return
    }
    const ok = await onDecide({ projectId: project.id, decision, feedback: feedback.trim() })
    if (ok) {
      setFeedback('')
      setTouched(false)
    }
  }

  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-start justify-between gap-xs">
        <div className="min-w-0">
          <Link
            to={buildPath(ROUTES.STUDENT.PROJECT_DETAILS, { id: project.id })}
            className="text-body-lg font-bold text-on-surface hover:text-secondary hover:underline"
          >
            {project.title}
          </Link>
          <p className="text-xs text-on-surface-variant">{project.summary}</p>
        </div>
        <Badge tone={status.tone}>{status.short}</Badge>
      </div>

      <label className="flex flex-col gap-xs">
        <span className="text-label-md font-semibold text-on-surface">Feedback to the team</span>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className={textareaClass}
          placeholder="Required when requesting changes or not selecting."
        />
        {touched && feedback.trim().length < 10 && (
          <span className="text-label-sm text-error" role="alert">
            Add at least 10 characters of feedback before handing this back.
          </span>
        )}
      </label>

      <div className="flex flex-wrap gap-sm border-t border-outline-variant pt-sm">
        <Button disabled={busy} onClick={() => submit('selected')}>
          Select for Final Development
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => submit('changes_requested')}>
          Request Changes
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => submit('not_selected')}>
          Not Selected
        </Button>
      </div>
    </Card>
  )
}
