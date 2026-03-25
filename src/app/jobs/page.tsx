import { RankedJobList } from '@/components/jobs/ranked-job-list'
import { seedJobs, seedImmigrationStatus } from '@/db/seed'
import type { UserState } from '@/lib/urgency-scoring'

// Phase 0: compute user state from seed data.
// Later: fetch from Supabase immigration_clock view.
const userState: UserState = {
  days_remaining: 150 - seedImmigrationStatus.initial_days_used,
  is_employed: false, // PostDoc ending — score as unemployed for job ranking
  offer_accepted_not_started: false,
  employment_end_date: null,
  in_grace_period: false,
  today: new Date().toISOString().split('T')[0],
}

export default function JobsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Today&apos;s Picks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by immigration fit. Cap-exempt roles are prioritized.
        </p>
      </div>

      <RankedJobList jobs={seedJobs} userState={userState} />
    </div>
  )
}
