/**
 * Faculty review form state + submission. Holds the evaluation draft (comment,
 * credits) locally and posts decisions through reviewsService — keeping the
 * business logic out of the UI (Component → Hook → Service → Repository → API).
 */
import { useState } from 'react'
import { reviewsService } from '@/services/catalog.service'
import type { ReviewDecisionInput, ReviewStatus, ReviewSubmission } from '@/types/domain'

type Decision = ReviewDecisionInput['decision']

export function useFacultyReview(submission: ReviewSubmission | null) {
  const [comment, setComment] = useState('')
  const [credits, setCredits] = useState(submission?.creditsAwarded ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [decided, setDecided] = useState<ReviewStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(decision: Decision) {
    if (!submission || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await reviewsService.submitDecision({
        submissionId: submission.id,
        decision,
        comment,
        creditsAwarded: credits,
      })
      setDecided(updated.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return { comment, setComment, credits, setCredits, submitting, decided, error, submit }
}
