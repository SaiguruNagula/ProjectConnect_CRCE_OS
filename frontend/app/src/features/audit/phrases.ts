/**
 * Wording for audit action codes (Phase 12).
 *
 * The backend stores an action as a code — `review.stage_approved`, `logout` —
 * and deliberately keeps no sentence and no titles beside it: its `meta` column
 * carries identifiers and outcomes only, never free text. So the sentence is
 * built here, which is where every other bit of wording in this app already
 * lives.
 *
 * Two feeds read from the same log and phrase it differently, so there are two
 * tables: what the institution built (staff activity) and who signed in
 * (identity history). Both fall back to the code itself rather than dropping a
 * row, so an action added by a later phase still reads sensibly here without a
 * frontend release.
 */

export interface ActivityPhrase {
  /** The verb, e.g. "approved a stage in". */
  action: string
  /** What it was done to, e.g. "a project". Rendered in bold by the feed. */
  target: string
}

export interface IdentityPhrase {
  message: string
  /** The badge the admin panel shows, e.g. "SUCCESS". */
  result: string
  ok: boolean
}

const ACTIVITY: Record<string, ActivityPhrase> = {
  'application.created': { action: 'applied to', target: 'a problem' },
  'application.withdrawn': { action: 'withdrew from', target: 'a problem' },
  'credit.awarded': { action: 'awarded credits for', target: 'a project' },
  'credit.revised': { action: 'revised the credits for', target: 'a project' },
  'credit.earned': { action: 'earned', target: 'credits' },
  'problem.created': { action: 'published', target: 'a problem' },
  'problem.draft_saved': { action: 'saved', target: 'a problem draft' },
  'project.published': { action: 'published', target: 'a solution' },
  'project.unpublished': { action: 'unpublished', target: 'a solution' },
  'review.stage_approved': { action: 'approved a stage in', target: 'a project' },
  'review.stage_changes_requested': { action: 'requested changes on', target: 'a project' },
  'review.stage_rejected': { action: 'rejected a stage in', target: 'a project' },
  'review.team_selected': { action: 'selected', target: 'a team' },
  'review.team_not_selected': { action: 'did not select', target: 'a team' },
  'submission.idea_submitted': { action: 'submitted', target: 'an idea' },
  'submission.idea_resubmitted': { action: 'resubmitted', target: 'an idea' },
  'submission.poc_submitted': { action: 'submitted', target: 'a proof of concept' },
  'submission.poc_resubmitted': { action: 'resubmitted', target: 'a proof of concept' },
  'submission.final_submitted': { action: 'submitted', target: 'a final project' },
  'submission.final_resubmitted': { action: 'resubmitted', target: 'a final project' },
  'suggestion.saved': { action: 'drafted', target: 'a problem suggestion' },
  'suggestion.submitted': { action: 'submitted', target: 'a problem suggestion' },
  'suggestion.decided': { action: 'decided on', target: 'a problem suggestion' },
  'team.created': { action: 'created', target: 'a team' },
  'team.disbanded': { action: 'disbanded', target: 'a team' },
  'team.member_left': { action: 'left', target: 'a team' },
  'team.member_removed': { action: 'removed a member from', target: 'a team' },
  'team.invitation_sent': { action: 'invited someone to', target: 'a team' },
  'team.invitation_accepted': { action: 'accepted an invitation to', target: 'a team' },
  'team.invitation_declined': { action: 'declined an invitation to', target: 'a team' },
  'team.join_requested': { action: 'asked to join', target: 'a team' },
  'team.join_request_accepted': { action: 'accepted a request to join', target: 'a team' },
  'team.join_request_rejected': { action: 'declined a request to join', target: 'a team' },
}

const IDENTITY: Record<string, IdentityPhrase> = {
  'login.succeeded': { message: 'signed in', result: 'SUCCESS', ok: true },
  'login.failed': { message: 'failed to sign in', result: 'FAILED', ok: false },
  'login.blocked': { message: 'was locked out after repeated attempts', result: 'BLOCKED', ok: false },
  'login.denied': { message: 'was denied access', result: 'DENIED', ok: false },
  logout: { message: 'signed out', result: 'SUCCESS', ok: true },
  'token.reuse_detected': { message: 'reused a revoked session token', result: 'REVOKED', ok: false },
}

/** "problem_suggestion" → "a problem suggestion". */
function article(entity: string | null): string {
  if (!entity) return ''
  const noun = entity.replace(/_/g, ' ')
  return `${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun}`
}

/** "team.join_requested" → "join requested". */
function readable(action: string): string {
  return (action.split('.').pop() ?? action).replace(/_/g, ' ')
}

export function activityPhrase(action: string, entity: string | null): ActivityPhrase {
  return ACTIVITY[action] ?? { action: readable(action), target: article(entity) }
}

export function identityPhrase(action: string): IdentityPhrase {
  return IDENTITY[action] ?? { message: readable(action), result: 'LOGGED', ok: true }
}

/** An audit row whose actor is gone, or was never known, still has to read as a sentence. */
export const UNKNOWN_ACTOR = 'An unknown account'
