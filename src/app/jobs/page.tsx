import { Sparkles } from 'lucide-react'
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
      {/* Page header — warm, not clinical */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles className="size-5 text-ocean" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Today&apos;s Picks
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ranked by how well each role fits your immigration timeline.
          Cap-exempt positions that can sponsor H1-B year-round are prioritized.
        </p>
      </div>

      <RankedJobList jobs={seedJobs} userState={userState} />
    </div>
  )
}
