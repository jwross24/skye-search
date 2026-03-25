import { KanbanBoard, type TrackedApplication } from '@/components/tracker/kanban-board'
import { seedJobs } from '@/db/seed'

function makeAppId(job: typeof seedJobs[number], index: number): string {
  // Use domain + title slug for uniqueness (multiple jobs can share a domain)
  const base = `${job.company_domain ?? job.company}-${job.title}`
  return `app-${base}-${index}`.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()
}

function buildSeedApplications(): TrackedApplication[] {
  const apps: TrackedApplication[] = []
  let idx = 0

  for (const job of seedJobs) {
    if (job.pre_applied) {
      apps.push({
        id: makeAppId(job, idx++),
        job,
        status: 'applied',
        dateAdded: job.pre_applied_date ?? '2026-03-24',
        notes: '',
        nextAction: '',
        nextActionDate: '',
        contacts: [],
      })
    }
  }

  // Add a couple of "interested" jobs for richer seed data
  const interestedJobs = seedJobs.filter((j) => !j.pre_applied).slice(0, 3)
  for (const job of interestedJobs) {
    apps.push({
      id: makeAppId(job, idx++),
      job,
      status: 'interested',
      dateAdded: '2026-03-25',
      notes: '',
      nextAction: '',
      nextActionDate: '',
      contacts: [],
    })
  }

  return apps
}

export default function TrackerPage() {
  const applications = buildSeedApplications()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Application Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your pipeline at a glance
        </p>
      </div>

      <KanbanBoard initialApplications={applications} />
    </div>
  )
}
