'use client'

import { useState, useMemo } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobRow } from './job-row'
import { computeUrgencyScore, jobToInput, type UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'

interface RankedJobListProps {
  jobs: Job[]
  userState: UserState
  trackedIds?: Set<string>
}

export function RankedJobList({ jobs, userState, trackedIds: initialTracked }: RankedJobListProps) {
  const [bridgeOnly, setBridgeOnly] = useState(false)
  const [tracked, setTracked] = useState<Set<string>>(initialTracked ?? new Set())

  // Score and sort jobs
  const scoredJobs = useMemo(() => {
    return jobs
      .map((job) => {
        const result = computeUrgencyScore(jobToInput(job, userState.today), userState)
        return { job, score: result.urgency_score }
      })
      .filter((item) => {
        // Filter out ineligible
        if (item.score < 0) return false
        // Bridge filter
        if (bridgeOnly) {
          return (
            item.job.visa_path === 'cap_exempt' &&
            item.job.employment_type === 'part_time'
          )
        }
        return true
      })
      .sort((a, b) => b.score - a.score)
  }, [jobs, userState, bridgeOnly])

  const handleTrack = async (index: number) => {
    const job = scoredJobs[index]
    if (job) setTracked((prev) => new Set(prev).add(job.job.id))
  }

  // Empty state — teach the interface, don't just say "nothing here"
  if (jobs.length === 0) {
    return (
      <div className="py-16">
        <h2 className="text-lg font-semibold text-foreground">
          No jobs loaded yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Your daily picks will appear here — cap-exempt roles, bridge positions,
          and opportunities ranked by how they fit your immigration timeline.
        </p>
      </div>
    )
  }

  // Bridge filter empty state
  if (scoredJobs.length === 0 && bridgeOnly) {
    return (
      <div>
        <ListHeader
          bridgeOnly={bridgeOnly}
          onToggleBridge={() => setBridgeOnly(!bridgeOnly)}
          count={0}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No bridge positions found right now. These are part-time 20+ hour
            roles at cap-exempt employers that stop your unemployment clock.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBridgeOnly(false)}
            className="mt-3 text-ocean"
          >
            Show all jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ListHeader
        bridgeOnly={bridgeOnly}
        onToggleBridge={() => setBridgeOnly(!bridgeOnly)}
        count={scoredJobs.length}
      />
      <div className="divide-y-0">
        {scoredJobs.map(({ job, score }, i) => (
          <JobRow
            key={job.id}
            job={job}
            urgencyScore={score}
            index={i}
            onTrack={handleTrack}
            isTracked={tracked.has(job.id)}
            today={userState.today}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ListHeader({
  bridgeOnly,
  onToggleBridge,
  count,
}: {
  bridgeOnly: boolean
  onToggleBridge: () => void
  count: number
}) {
  return (
    <div className="flex items-center justify-between pb-3 mb-1">
      <p className="text-sm text-muted-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {count} {count === 1 ? 'position' : 'positions'} ranked by immigration fit
      </p>
      <Button
        variant={bridgeOnly ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onToggleBridge}
        className={`gap-1.5 ${bridgeOnly ? 'bg-badge-bridge/10 text-badge-bridge' : 'text-muted-foreground'}`}
      >
        <Filter className="size-3.5" />
        Bridge Jobs
      </Button>
    </div>
  )
}
