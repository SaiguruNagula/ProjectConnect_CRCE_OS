/**
 * Faculty Review Engine — the Stitch "Faculty Review Dashboard" layout (stat
 * tiles, a queue on the left, an evaluation panel on the right) driven by the
 * CRCE OS lifecycle: one queue per review stage instead of one generic backlog.
 * Faculty here are reviewers and mentors — there is no plan to manage, only
 * submissions to evaluate. Every decision posts through useFacultyReview.
 */
import type { ReviewQueueId } from '@/types/domain'
import { useFacultyReview } from '@/hooks/useFacultyReview'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Toast } from '@/components/feedback/Toast'
import { ReviewQueueCard } from './ReviewQueueCard'
import { StageReviewPanel } from './StageReviewPanel'
import { REVIEW_QUEUES } from './stages'

export function FacultyReviewView() {
  const review = useFacultyReview()
  const { queues, queue, items, selected, journey } = review

  if (review.loading) return <PageLoader />
  if (review.error) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="rate_review" title="Could not load the review queues" description={review.error} />
      </div>
    )
  }

  const pending = queues.idea.length + queues.poc.length + queues.final.length

  return (
    <div className="mx-auto w-full max-w-container-max px-md py-lg md:px-lg">
      {/* Summary tiles — the workload, by stage */}
      <section className="mb-lg grid grid-cols-1 gap-md md:grid-cols-4">
        <StatTile label="Pending Reviews" value={pending} bar="bg-secondary" valueClass="text-primary" />
        <StatTile
          label="Idea Reviews"
          value={queues.idea.length}
          bar="bg-secondary-container"
          valueClass="text-secondary"
          pad2
        />
        <StatTile
          label="PoC Reviews"
          value={queues.poc.length}
          bar="bg-secondary-container"
          valueClass="text-secondary"
          pad2
        />
        <StatTile
          label="Completed"
          value={queues.completed.length}
          bar="bg-outline-variant"
          valueClass="text-on-surface-variant"
        />
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        {/* Stage queues */}
        <section className="flex flex-col gap-sm lg:col-span-4">
          <h2 className="px-2 text-headline-sm">Review Queues</h2>
          <div role="tablist" aria-label="Review queues" className="flex flex-col gap-base">
            {REVIEW_QUEUES.map((tab) => {
              const count = queues[tab.id].length
              const active = tab.id === queue
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => review.selectQueue(tab.id as ReviewQueueId)}
                  className={`flex items-center gap-sm rounded-xl border px-md py-sm text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                    active
                      ? 'border-secondary bg-secondary-container/20 text-on-surface'
                      : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{tab.icon}</span>
                  <span className="flex-1 text-label-md font-semibold">{tab.label}</span>
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-[11px] font-bold">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-sm flex flex-col gap-sm">
            {items.length === 0 ? (
              <EmptyState icon="inbox" title="Nothing in this queue" description="Every submission here has been reviewed." />
            ) : (
              items.map((item) => (
                <ReviewQueueCard
                  key={item.projectId}
                  item={item}
                  selected={item.projectId === selected?.projectId}
                  onSelect={() => review.selectItem(item.projectId)}
                />
              ))
            )}
          </div>
        </section>

        {/* Evaluation panel */}
        <section className="lg:col-span-8">
          {review.detailLoading && <PageLoader />}
          {!review.detailLoading && journey && selected && (
            <StageReviewPanel
              key={`${journey.projectId}-${selected.stage}`}
              journey={journey}
              stage={selected.stage}
              editable={queue !== 'completed'}
              busy={review.busy}
              onDecide={review.decide}
              onAwardCredits={review.awardCredits}
              onPublish={review.setPublication}
            />
          )}
          {!review.detailLoading && !journey && (
            <EmptyState
              icon="rate_review"
              title="Select a submission"
              description={review.detailError ?? 'Pick a card from the queue to review it.'}
            />
          )}
        </section>
      </div>

      <Toast tone="success" message={review.actionMessage} onDismiss={review.dismissMessage} />
      <Toast tone="error" message={review.actionError} onDismiss={review.dismissError} />
    </div>
  )
}

function StatTile({
  label,
  value,
  bar,
  valueClass,
  pad2 = false,
}: {
  label: string
  value: number
  bar: string
  valueClass: string
  pad2?: boolean
}) {
  return (
    <div className="flex flex-col gap-xs rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-lg transition-all hover:scale-[1.02]">
      <span className="text-label-md uppercase tracking-wider text-on-surface-variant">{label}</span>
      <div className={`text-display ${valueClass}`}>{pad2 ? String(value).padStart(2, '0') : value}</div>
      <div className={`mt-xs h-1 w-12 rounded-full ${bar}`} />
    </div>
  )
}
