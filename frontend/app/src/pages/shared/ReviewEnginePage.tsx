/**
 * Review Engine. Serves the shared /review route and the faculty /faculty/review
 * route — one implementation, role-aware via useRole. Faculty get the review
 * dashboard (queue + evaluation panel with credit awarding and decisions);
 * everyone else gets the read-only student view (status, feedback, history).
 * Data flows through reviewsService; no review data is hardcoded in the UI.
 */
import { useRole } from '@/contexts/RoleContext'
import { useAsync } from '@/hooks/useAsync'
import { reviewsService } from '@/services/catalog.service'
import type { ReviewStats, ReviewSubmission } from '@/types/domain'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { StudentReviewView } from '@/features/reviews/StudentReviewView'
import { FacultyReviewView } from '@/features/reviews/FacultyReviewView'

export function ReviewEnginePage() {
  const { role } = useRole()
  const isFaculty = role === 'faculty'
  const { data: submissions, loading, error } = useAsync<ReviewSubmission[]>(() => reviewsService.list())
  const { data: stats } = useAsync<ReviewStats>(() => reviewsService.stats())

  if (loading) return <PageLoader />
  if (error || !submissions || submissions.length === 0) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState icon="rate_review" title="No submissions to review" description={error ?? undefined} />
      </div>
    )
  }

  if (isFaculty) {
    return <FacultyReviewView stats={stats} submissions={submissions} />
  }

  // Student read-only view — the student's active review (falls back to the first).
  const current =
    submissions.find((s) => s.status === 'under_review' || s.status === 'pending') ?? submissions[0]
  return <StudentReviewView submission={current} />
}
