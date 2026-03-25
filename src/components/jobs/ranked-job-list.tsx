'use client'

import { useState, useMemo } from 'react'
import { Filter, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobRow } from './job-row'
import { computeUrgencyScore, type JobInput, type UserState } from '@/lib/urgency-scoring'
import type { SeedJob } from '@/db/seed'

interface RankedJobListProps {
  jobs: SeedJob[]
  userState: UserState
  trackedIndices?: Set<number>
}

function seedJobToInput(job: SeedJob): JobInput {
  return {
    visa_path: job.visa_path,
    employer_type: job.employer_type,
    cap_exempt_confidence: job.cap_exempt_confidence,
    employment_type: job.employment_type,
    source_type: job.source_type,
    location: job.location,
    h1b_sponsor_count: job.h1b_sponsor_count,
    application_deadline: job.application_deadline,
    application_complexity: job.application_complexity,
    indexed_date: '2026-03-24',
  }
}

export function RankedJobList({ jobs, userState, trackedIndices: initialTracked }: RankedJobListProps) {
  const [bridgeOnly, setBridgeOnly] = useState(false)
  const [tracked, setTracked] = useState<Set<number>>(initialTracked ?? new Set())

  // Score and sort jobs
  const scoredJobs = useMemo(() => {
    return jobs
      .map((job, originalIndex) => {
        const result = computeUrgencyScore(seedJobToInput(job), userState)
        return { job, originalIndex, score: result.urgency_score }
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
    setTracked((prev) => new Set(prev).add(index))
  }

  // Empty state
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-ocean/10 mb-4">
          <Sparkles className="size-6 text-ocean" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          No jobs loaded yet
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Jobs will appear here once the seed data is loaded. Check back soon.
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
        {scoredJobs.map(({ job, originalIndex, score }) => (
          <JobRow
            key={originalIndex}
            job={job}
            urgencyScore={score}
            index={originalIndex}
            onTrack={handleTrack}
            isTracked={tracked.has(originalIndex)}
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
    <div className="flex items-center justify-between pb-4 mb-2">
      <div>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? 'position' : 'positions'} ranked by immigration fit
        </p>
      </div>
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

export { seedJobToInput }
