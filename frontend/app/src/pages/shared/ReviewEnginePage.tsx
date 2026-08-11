/**
 * Review Engine. Serves the shared /review route and the faculty /faculty/review
 * route — one implementation, role-aware via useRole. Faculty get the stage
 * review queues (Idea, Proof of Concept, Final Project, Completed) with the
 * evaluation panel; everyone else gets the read-only view of their own
 * submission journey. Each view owns its data through its hook.
 */
import { useRole } from '@/contexts/RoleContext'
import { useProjectJourney } from '@/hooks/useProjectJourney'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { EmptyState } from '@/components/ui/EmptyState'
import { StudentReviewView } from '@/features/reviews/StudentReviewView'
import { FacultyReviewView } from '@/features/reviews/FacultyReviewView'

export function ReviewEnginePage() {
  const { role } = useRole()

  if (role === 'faculty') {
    return (
      <>
        <h1 className="sr-only">Review Engine</h1>
        <FacultyReviewView />
      </>
    )
  }

  return (
    <>
      <h1 className="sr-only">Review Engine</h1>
      <StudentReviewEngine />
    </>
  )
}

/** The student's own journey — the same record faculty reviewed, read-only. */
function StudentReviewEngine() {
  const { journey, loading, error } = useProjectJourney()

  if (loading) return <PageLoader />
  if (error || !journey) {
    return (
      <div className="mx-auto max-w-container-max">
        <EmptyState
          icon="rate_review"
          title="Nothing under review yet"
          description={error ?? 'Apply to an open problem and submit your idea to start the review process.'}
        />
      </div>
    )
  }

  return <StudentReviewView journey={journey} />
}
