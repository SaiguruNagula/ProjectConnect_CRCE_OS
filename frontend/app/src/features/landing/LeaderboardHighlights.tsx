/** Leaderboard highlights — top students (live) + department/mentor previews. */
import type { ReactNode } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { leaderboardService } from '@/services/catalog.service'
import type { LeaderboardEntry } from '@/types/domain'
import { Avatar } from '@/components/ui/Avatar'

const DEPARTMENTS = [
  { name: 'Computer Eng.', value: '4.8 Impact' },
  { name: 'Electronics', value: '4.2 Impact' },
]
const MENTORS = [
  { name: 'Dr. R. Mehta', value: '12 Projects' },
  { name: 'Prof. S. Patil', value: '9 Projects' },
]

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="stripe-border rounded-xl bg-white p-md">
      <h3 className="mb-md border-b pb-xs font-label-md uppercase text-on-surface-variant">{title}</h3>
      <div className="space-y-sm">{children}</div>
    </div>
  )
}

function Row({ label, value, avatar }: { label: string; value: string; avatar?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-sm">
        {avatar && <Avatar initials={avatar} size="sm" />}
        <span className="font-body-md font-medium">{label}</span>
      </div>
      <span className="font-mono font-bold text-secondary">{value}</span>
    </div>
  )
}

export function LeaderboardHighlights() {
  const { data } = useAsync<LeaderboardEntry[]>(() => leaderboardService.students())
  const topStudents = (data ?? []).slice(0, 2)

  return (
    <section className="mx-auto max-w-container-max px-md py-xl">
      <h2 className="mb-lg text-center font-headline-lg text-headline-lg">Leaderboard Highlights</h2>
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        <Column title="Top Students">
          {topStudents.map((s) => (
            <Row key={s.id} label={s.name} value={`${s.credits.toLocaleString()} pts`} avatar={s.avatarInitials} />
          ))}
        </Column>
        <Column title="Top Departments">
          {DEPARTMENTS.map((d) => (
            <Row key={d.name} label={d.name} value={d.value} />
          ))}
        </Column>
        <Column title="Top Mentors">
          {MENTORS.map((m) => (
            <Row key={m.name} label={m.name} value={m.value} />
          ))}
        </Column>
      </div>
    </section>
  )
}
