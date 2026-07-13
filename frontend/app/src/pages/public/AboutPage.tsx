/** Public About page. Static content describing the platform's mission. */
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'

const PILLARS = [
  { icon: 'lightbulb', title: 'Problem-driven', body: 'Every project begins with a real, well-defined problem.' },
  { icon: 'groups', title: 'Collaborative', body: 'Interdisciplinary teams build and ship together.' },
  { icon: 'verified', title: 'Verified', body: 'Credits and portfolios come only from reviewed, real work.' },
  { icon: 'insights', title: 'Measurable', body: 'Leadership sees innovation health through live analytics.' },
]

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg px-md py-lg">
      <PageHeader
        title="About CRCE OS"
        subtitle="An Innovation Operating System for higher education."
      />
      <Card>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          CRCE OS transforms institutional problems into student-led innovation through one
          connected lifecycle — problem discovery, team formation, project development, faculty
          review, credit recognition, leaderboards and verified portfolios. It is not an LMS or an
          ERP; it is the operating system for continuous campus innovation.
        </p>
      </Card>
      <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p) => (
          <Card key={p.title} className="flex flex-col gap-xs">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container/20 text-secondary">
              <span className="material-symbols-outlined" aria-hidden="true">{p.icon}</span>
            </span>
            <h3 className="text-base font-semibold text-on-surface">{p.title}</h3>
            <p className="text-sm text-on-surface-variant">{p.body}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
