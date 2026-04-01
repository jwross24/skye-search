'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Coffee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PickCard } from './pick-card'
import { computeUrgencyScore, jobToInput, type UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'
import { voteOnJob, type VoteDecision, type DismissTag } from '@/app/jobs/actions'

const BATCH_SIZE = 8

interface DailyBatchProps {
  jobs: Job[]
  userState: UserState
}

interface VoteRecord {
  decision: VoteDecision
  tags: DismissTag[]
}

export function DailyBatch({ jobs, userState }: DailyBatchProps) {
  const [votes, setVotes] = useState<Map<string, VoteRecord>>(new Map())
  const [exitedEarly, setExitedEarly] = useState(false)

  // Score, sort, and pick top 8
  const batch = useMemo(() => {
    return jobs
      .map((job) => {
        const result = computeUrgencyScore(jobToInput(job, userState.today), userState)
        return { job, score: result.urgency_score }
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, BATCH_SIZE)
  }, [jobs, userState])

  const handleVote = (jobId: string, decision: VoteDecision, tags: DismissTag[] = []) => {
    setVotes((prev) => {
      const next = new Map(prev)
      next.set(jobId, { decision, tags })
      return next
    })
    // Persist to Supabase (fire-and-forget — optimistic UI)
    voteOnJob(jobId, decision, tags)
  }

  // Empty batch — check before allReviewed (0 >= 0 is true)
  if (batch.length === 0) {
    return (
      <div className="py-16">
        <h2 className="text-lg font-semibold text-foreground">
          No picks today
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Your daily picks will appear here — cap-exempt roles, bridge positions,
          and opportunities ranked by how they fit your immigration timeline.
        </p>
      </div>
    )
  }

  const reviewedCount = votes.size
  const allReviewed = reviewedCount >= batch.length
  const activeCards = batch.filter((item) => !votes.has(item.job.id))

  // "Enough for today" or "All reviewed" state
  if (exitedEarly || allReviewed) {
    const interestedCount = Array.from(votes.values()).filter(
      (v) => v.decision === 'interested',
    ).length
    const savedCount = Array.from(votes.values()).filter(
      (v) => v.decision === 'save_for_later',
    ).length

    return (
      <div className="py-12 animate-in fade-in duration-500">
        <h2 className="text-lg font-semibold text-foreground">
          {allReviewed ? "You've seen today's picks" : "Taking a break"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
          {interestedCount > 0 && `${interestedCount} added to your tracker. `}
          {savedCount > 0 && `${savedCount} saved for later. `}
          {allReviewed
            ? 'New matches will appear tomorrow.'
            : `${activeCards.length} picks still waiting when you're ready.`}
        </p>
        {exitedEarly && !allReviewed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExitedEarly(false)}
            className="mt-3 text-ocean"
          >
            Keep going
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Progress + exit */}
      <div className="flex items-center justify-between pb-3 mb-1">
        <p
          className="text-sm text-muted-foreground"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {reviewedCount} of {batch.length} reviewed
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExitedEarly(true)}
          className="gap-1.5 text-muted-foreground"
        >
          <Coffee className="size-3.5" />
          That&apos;s enough for today
        </Button>
      </div>

      {/* Card stack */}
      <AnimatePresence mode="popLayout">
        {batch.map(({ job, score }, i) => {
          if (votes.has(job.id)) {
            // Show voted confirmation inline
            const vote = votes.get(job.id)!
            const messages: Record<VoteDecision, string> = {
              interested: 'Added to your tracker',
              not_for_me: 'Got it — noted',
              save_for_later: 'Saved for later',
            }
            return (
              <div
                key={job.id}
                className="py-2 text-sm text-muted-foreground/60 animate-in fade-in duration-200"
                data-testid={`pick-card-voted-${job.id}`}
              >
                <span className="text-xs">{messages[vote.decision]}</span>
                <div className="h-px bg-border/30 mt-2" />
              </div>
            )
          }

          return (
            <PickCard
              key={job.id}
              job={job}
              urgencyScore={score}
              onVote={handleVote}
              staggerIndex={i}
              today={userState.today}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
