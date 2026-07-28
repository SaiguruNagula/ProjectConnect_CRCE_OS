/**
 * Team Formation — ported from the approved Stitch "dual application flow".
 *
 * Scoped to the problem carried in `?problem=<id>` (falling back to the first
 * open problem when opened without context), a student can browse and request
 * to join teams, review their roster, respond to invitations, and choose how to
 * participate — create a team, apply with their team, or apply solo. Every
 * action goes through useTeamFormation; this page owns no mutation state.
 */
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import { useTeamFormation } from '@/hooks/useTeamFormation'
import { buildPath, QUERY_PARAMS, ROUTES } from '@/constants/routes'
import type { Team, TeamMember } from '@/types/domain'
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/feedback/LoadingBoundary'
import { ActionBanner } from '@/components/feedback/ActionBanner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { daysLeft } from '@/utils/date'

const teamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  idea: z.string().min(10, 'Describe your idea in at least 10 characters'),
  lookingFor: z.string().min(2, 'List at least one role or skill'),
})
type TeamForm = z.infer<typeof teamSchema>

export function TeamFormationPage() {
  const [searchParams] = useSearchParams()
  const {
    problem,
    myTeam,
    rows,
    roles,
    invitations,
    filters,
    setFilter,
    loading,
    error,
    busy,
    actionError,
    actionMessage,
    dismissError,
    dismissMessage,
    createTeam,
    requestToJoin,
    apply,
    withdraw,
    respondToInvitation,
  } = useTeamFormation(searchParams.get(QUERY_PARAMS.PROBLEM) ?? undefined)

  const [showCreate, setShowCreate] = useState(false)

  const applied = problem?.applicationStatus && problem.applicationStatus !== 'none'
    ? problem.applicationStatus
    : null
  const myTeamName = myTeam?.name ?? null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeamForm>({ resolver: zodResolver(teamSchema) })

  const onCreate = async (values: TeamForm) => {
    const ok = await createTeam({
      name: values.name,
      pitch: values.idea,
      lookingFor: values.lookingFor
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean),
    })
    if (ok) {
      setShowCreate(false)
      reset()
    }
  }

  if (loading) return <PageLoader />

  if (!problem) {
    return (
      <div className="mx-auto w-full max-w-container-max px-md py-lg">
        <EmptyState
          icon="groups"
          title="No problem in context"
          description={error ?? 'Pick an open problem to start forming a team.'}
          action={
            <Link
              to={ROUTES.SHARED.OPEN_PROBLEMS}
              className="text-sm font-medium text-secondary hover:underline"
            >
              Browse open problems
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-lg px-md py-lg md:px-lg lg:px-xl">
      <PageHeader
        title="Team Formation"
        subtitle="Join a team, build your own, or apply solo to this problem."
      />

      <ActionBanner tone="success" message={actionMessage} onDismiss={dismissMessage} />
      <ActionBanner tone="error" message={actionError} onDismiss={dismissError} />

      {/* Featured problem context */}
      {problem && (
        <Card className="flex flex-col justify-between gap-md md:flex-row md:items-start">
          <div className="max-w-3xl">
            <div className="mb-sm flex flex-wrap items-center gap-xs">
              <Badge tone="primary" className="uppercase tracking-wide">
                {problem.department}
              </Badge>
              <Badge tone={problem.status === 'closed' ? 'neutral' : 'success'}>
                {problem.status === 'closed'
                  ? 'Closed'
                  : problem.status === 'in_progress'
                    ? 'Building Team'
                    : 'Open'}
              </Badge>
            </div>
            <h2 className="mb-xs text-headline-md text-primary">{problem.title}</h2>
            <p className="mb-md text-body-md text-on-surface-variant">{problem.summary}</p>
            <div className="flex flex-wrap gap-md text-on-surface-variant">
              <InfoRow icon="stars">
                <span className="font-mono text-sm">{problem.creditReward} Credits</span>
              </InfoRow>
              <InfoRow icon="group">
                <span className="font-mono text-sm">
                  {problem.currentTeamCount}/{problem.teamSize} Members
                </span>
              </InfoRow>
              <InfoRow icon="schedule">
                <span className="font-mono text-sm">{daysLeft(problem.endDate)} Days Left</span>
              </InfoRow>
            </div>
          </div>
          <Link
            to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: problem.id })}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-xs rounded-lg border border-outline-variant px-md text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
          >
            View Problem
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_outward</span>
          </Link>
        </Card>
      )}

      <div className="grid gap-lg lg:grid-cols-3">
        {/* Main column: discovery, teams, roster */}
        <div className="flex flex-col gap-lg lg:col-span-2">
          {/* Search + role filters */}
          <div className="flex flex-col gap-sm">
            <div className="relative">
              <span
                className="material-symbols-outlined pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                aria-label="Search teams"
                value={filters.query}
                onChange={(e) => setFilter('query', e.target.value)}
                placeholder="Search teams or members…"
                className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-[44px] pr-sm text-sm text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div className="flex flex-wrap gap-xs">
              <Chip active={filters.role === ''} onClick={() => setFilter('role', '')}>
                All roles
              </Chip>
              {roles.map((r) => (
                <Chip
                  key={r}
                  active={filters.role === r}
                  onClick={() => setFilter('role', filters.role === r ? '' : r)}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </div>

          {/* Available teams */}
          <section className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm text-primary">Available Teams</h2>
              <span className="text-label-md text-on-surface-variant">{rows.length} Active</span>
            </div>
            {rows.length > 0 ? (
              <div className="grid gap-md sm:grid-cols-2">
                {rows.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    busy={busy}
                    onJoin={() => requestToJoin(team.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="search_off"
                title="No teams match your filters"
                description="Try clearing a filter or start your own team."
              />
            )}
          </section>

          {/* My team roster */}
          {myTeam && (
            <section className="flex flex-col gap-sm">
              <h2 className="text-headline-sm text-primary">
                Your Team {myTeamName ? `· ${myTeamName}` : ''} ({myTeam.members.length} Members)
              </h2>
              <div className="grid gap-md sm:grid-cols-2">
                {myTeam.members.map((m) => (
                  <MemberCard key={m.id} member={m} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-md">
          {/* Participation actions */}
          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Participation</h2>
            {applied ? (
              <div className="flex flex-col items-start gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm">
                <Badge tone="success">
                  {applied === 'team' ? `Applied as ${myTeamName}` : 'Applied Individually'}
                </Badge>
                <p className="text-sm text-on-surface-variant">
                  Your application is with the project guide for review.
                </p>
                <Button variant="ghost" size="sm" disabled={busy} onClick={withdraw}>
                  Withdraw
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-sm">
                <ActionRow
                  icon="add_circle"
                  title="Create a team"
                  description="Start your own team and invite students."
                >
                  <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
                    {showCreate ? 'Cancel' : 'Create Team'}
                  </Button>
                </ActionRow>

                {showCreate && (
                  <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-sm" noValidate>
                    <Field label="Team name" error={errors.name?.message}>
                      <input {...register('name')} className={fieldClass} aria-invalid={!!errors.name} />
                    </Field>
                    <Field label="Project idea" error={errors.idea?.message}>
                      <textarea {...register('idea')} rows={3} className={fieldClass} aria-invalid={!!errors.idea} />
                    </Field>
                    <Field label="Looking for" error={errors.lookingFor?.message}>
                      <input
                        {...register('lookingFor')}
                        placeholder="e.g. ML Engineer, UI Designer"
                        className={fieldClass}
                        aria-invalid={!!errors.lookingFor}
                      />
                    </Field>
                    <Button type="submit" size="sm" disabled={isSubmitting || busy} className="self-start">
                      Create team
                    </Button>
                  </form>
                )}

                <ActionRow
                  icon="send"
                  title="Apply as my team"
                  description={
                    myTeamName ? `Submit ${myTeamName} for this project.` : 'Create or join a team first.'
                  }
                >
                  <Button size="sm" disabled={!myTeam || busy} onClick={() => apply(true)}>
                    Apply as Team
                  </Button>
                </ActionRow>

                <ActionRow
                  icon="person"
                  title="Apply solo"
                  description="Work independently and let faculty review your application."
                >
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(false)}>
                    Apply Solo
                  </Button>
                </ActionRow>
              </div>
            )}
          </Card>

          {/* Faculty guide */}
          {problem && (
            <Card className="flex items-center gap-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-container/15 text-secondary">
                <span className="material-symbols-outlined" aria-hidden="true">school</span>
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface">{problem.facultyName}</p>
                <p className="text-xs uppercase tracking-wide text-secondary">{problem.department}</p>
                <p className="text-xs text-on-surface-variant">Mentoring and reviewing progress.</p>
              </div>
            </Card>
          )}

          {/* Project status */}
          {problem && (
            <Card className="flex flex-col gap-xs bg-primary text-on-primary">
              <h3 className="text-label-md uppercase tracking-widest opacity-60">Project Status</h3>
              <StatusRow label="Members" value={`${problem.currentTeamCount} / ${problem.teamSize}`} />
              <StatusRow label="Applicants" value={String(problem.applicantsCount)} />
              <StatusRow label="Deadline" value={`${daysLeft(problem.endDate)} Days`} last />
            </Card>
          )}

          {/* Invitations */}
          <Card className="flex flex-col gap-sm">
            <h2 className="text-base font-semibold text-on-surface">Pending invitations</h2>
            {invitations.length > 0 ? (
              <ul className="flex flex-col gap-sm">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex flex-col gap-xs rounded-lg border border-outline-variant p-sm">
                    <span className="text-sm font-medium text-on-surface">{inv.projectTitle}</span>
                    <span className="text-xs text-on-surface-variant">
                      Invited by {inv.invitedBy} · {inv.role}
                    </span>
                    {inv.problemId && (
                      <Link
                        to={buildPath(ROUTES.SHARED.PROBLEM_DETAILS, { id: inv.problemId })}
                        className="text-xs font-medium text-secondary hover:underline"
                      >
                        Read the problem brief
                      </Link>
                    )}
                    <div className="flex gap-xs">
                      <Button size="sm" disabled={busy} onClick={() => respondToInvitation(inv.id, true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => respondToInvitation(inv.id, false)}>
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="mail" title="No pending invitations" />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

const fieldClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-base text-sm">
      <span className="font-medium text-on-surface">{label}</span>
      {children}
      {error && <span className="text-xs text-error" role="alert">{error}</span>}
    </label>
  )
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-xs">
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>
      {children}
    </span>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-secondary px-sm py-base text-label-md font-medium text-on-secondary'
          : 'rounded-full bg-surface-container-high px-sm py-base text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-highest'
      }
    >
      {children}
    </button>
  )
}

function AvatarStack({ members }: { members: TeamMember[] }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 4).map((m) => (
        <Avatar
          key={m.id}
          initials={m.avatarInitials}
          size="sm"
          className="border-2 border-surface-container-lowest"
        />
      ))}
    </div>
  )
}

function TeamCard({ team, busy, onJoin }: { team: Team; busy: boolean; onJoin: () => void }) {
  const requested = !!team.joinRequested
  const full = team.openSpots === 0
  return (
    <Card className="flex flex-col gap-md transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-xs">
        <h3 className="text-body-lg font-bold text-primary">{team.name}</h3>
        <AvatarStack members={team.members} />
      </div>
      <p className="text-body-md text-on-surface-variant">{team.pitch}</p>
      <div className="mt-auto flex items-center justify-between">
        <span className="font-mono text-label-md font-medium text-secondary">
          {team.openSpots} {team.openSpots === 1 ? 'spot' : 'spots'} open
        </span>
        <Button size="sm" disabled={requested || full || busy} onClick={onJoin}>
          {requested ? 'Request Sent' : full ? 'Team Full' : 'Join Team'}
        </Button>
      </div>
    </Card>
  )
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <Card className="flex items-center gap-md">
      <Avatar initials={member.avatarInitials} />
      <div>
        <p className="text-sm font-semibold text-on-surface">{member.name}</p>
        <Badge className="mt-base uppercase tracking-tight">{member.role}</Badge>
      </div>
    </Card>
  )
}

function ActionRow({
  icon,
  title,
  description,
  children,
}: {
  icon: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-sm">
      <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="mb-xs text-xs text-on-surface-variant">{description}</p>
        {children}
      </div>
    </div>
  )
}

function StatusRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-xs ${last ? '' : 'border-b border-white/10'}`}>
      <span className="text-sm opacity-80">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  )
}
