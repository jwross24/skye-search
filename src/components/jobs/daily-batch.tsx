'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Coffee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PickCard } from './pick-card'
import { UndoToast } from './undo-toast'
import { computeUrgencyScore, jobToInput, type UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'
import { voteOnJob, type VoteDecision, type DismissTag } from '@/app/jobs/actions'
import { getBatchFramingMessage } from '@/lib/batch-sizing'

/** Bridge jobs stop the unemployment clock: (cap_exempt OR opt_compatible) AND (part_time OR contract). */
function isBridgeJob(job: Job): boolean {
  const bridgeVisaPaths: string[] = ['cap_exempt', 'opt_compatible']
  const bridgeEmploymentTypes: string[] = ['part_time', 'contract']
  return bridgeVisaPaths.includes(job.visa_path) && bridgeEmploymentTypes.includes(job.employment_type)
}

const DEFAULT_BATCH_SIZE = 8

interface DailyBatchProps {
  jobs: Job[]
  userState: UserState
  batchSize?: number
  undoDelayMs?: number
}

interface VoteRecord {
  decision: VoteDecision
  tags: DismissTag[]
}

interface PendingVote {
  jobId: string
  decision: VoteDecision
  tags: DismissTag[]
}

const DEFAULT_UNDO_DELAY = 4000

export function DailyBatch({ jobs, userState, batchSize = DEFAULT_BATCH_SIZE, undoDelayMs = DEFAULT_UNDO_DELAY }: DailyBatchProps) {
  const [votes, setVotes] = useState<Map<string, VoteRecord>>(new Map())
  const [exitedEarly, setExitedEarly] = useState(false)
  const [pendingUndo, setPendingUndo] = useState<PendingVote | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancel pending vote on unmount (navigate away = cancel, not commit)
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const framingMessage = getBatchFramingMessage(batchSize)

  // Score, sort, and pick top N (dynamic based on clock pressure)
  const batch = useMemo(() => {
    return jobs
      .map((job) => {
        const result = computeUrgencyScore(jobToInput(job, userState.today), userState)
        return { job, score: result.urgency_score }
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, batchSize)
  }, [jobs, userState, batchSize])

  // Clock-pressure sectioning: split into "Stop the Clock" and "Build Your Future"
  // when days_remaining < 60 AND 2+ bridge jobs exist in the batch
  const { bridgeJobs, futureJobs, showSections } = useMemo(() => {
    if (userState.days_remaining >= 60) {
      return { bridgeJobs: [], futureJobs: [], showSections: false }
    }

    const bridge = batch.filter(({ job }) => isBridgeJob(job))
    if (bridge.length < 2) {
      return { bridgeJobs: [], futureJobs: [], showSections: false }
    }

    const future = batch.filter(({ job }) => !isBridgeJob(job))
    return { bridgeJobs: bridge, futureJobs: future, showSections: true }
  }, [batch, userState.days_remaining])

  const commitVote = useCallback((jobId: string, decision: VoteDecision, tags: DismissTag[]) => {
    voteOnJob(jobId, decision, tags)
    setPendingUndo(null)
  }, [])

  const handleVote = useCallback((jobId: string, decision: VoteDecision, tags: DismissTag[] = []) => {
    // If there's a pending undo from a previous vote, commit it immediately
    if (timerRef.current && pendingUndo) {
      clearTimeout(timerRef.current)
      voteOnJob(pendingUndo.jobId, pendingUndo.decision, pendingUndo.tags)
    }

    // Optimistic UI: mark as voted immediately
    setVotes((prev) => {
      const next = new Map(prev)
      next.set(jobId, { decision, tags })
      return next
    })

    if (undoDelayMs === 0) {
      // No undo window — commit immediately (used in tests)
      voteOnJob(jobId, decision, tags)
      return
    }

    // Show undo toast and delay the server action
    const pending = { jobId, decision, tags }
    setPendingUndo(pending)

    timerRef.current = setTimeout(() => {
      commitVote(jobId, decision, tags)
      timerRef.current = null
    }, undoDelayMs)
  }, [pendingUndo, commitVote, undoDelayMs])

  const handleUndo = useCallback(() => {
    if (!pendingUndo) return

    // Cancel the pending server action
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Restore the card
    setVotes((prev) => {
      const next = new Map(prev)
      next.delete(pendingUndo.jobId)
      return next
    })

    setPendingUndo(null)
  }, [pendingUndo])

  const handleExpire = useCallback(() => {
    // Timer already fired via setTimeout — just clear the toast
    setPendingUndo(null)
  }, [])

  const voteMessages: Record<VoteDecision, string> = {
    interested: 'Added to your tracker',
    not_for_me: 'Got it — noted',
    save_for_later: 'Saved for later',
  }

  const renderJobCard = (job: Job, score: number, staggerIndex: number) => {
    if (votes.has(job.id)) {
      const vote = votes.get(job.id)!
      return (
        <div
          key={job.id}
          className="py-2 text-sm text-muted-foreground/60 animate-in fade-in duration-200"
          data-testid={`pick-card-voted-${job.id}`}
        >
          <span className="text-xs">{voteMessages[vote.decision]}</span>
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
        staggerIndex={staggerIndex}
        today={userState.today}
      />
    )
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
    <div className="relative">
      {/* Warm framing when batch is larger than default */}
      {framingMessage && (
        <p className="text-sm text-ocean mb-3">{framingMessage}</p>
      )}

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

      {/* Card stack — sectioned when clock pressure is high */}
      {showSections ? (
        <>
          {/* Bridge roles section — ready to start immediately */}
          <section className="mb-10" aria-labelledby="section-ready-today">
            <div className="mb-4">
              <h3 id="section-ready-today" className="text-base font-medium text-jade">
                Ready today
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Part-time and contract roles you could start this week.
              </p>
            </div>
            <AnimatePresence mode="popLayout">
              {bridgeJobs.map(({ job, score }, i) => (
                renderJobCard(job, score, i)
              ))}
            </AnimatePresence>
          </section>

          {/* Longer-horizon full-time roles */}
          {futureJobs.length > 0 && (
            <section aria-labelledby="section-longer-look">
              <div className="mb-4">
                <h3 id="section-longer-look" className="text-base font-medium text-foreground">
                  Worth a longer look
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Full-time positions ranked by fit.
                </p>
              </div>
              <AnimatePresence mode="popLayout">
                {futureJobs.map(({ job, score }, i) => (
                  renderJobCard(job, score, bridgeJobs.length + i)
                ))}
              </AnimatePresence>
            </section>
          )}
        </>
      ) : (
        <AnimatePresence mode="popLayout">
          {batch.map(({ job, score }, i) => (
            renderJobCard(job, score, i)
          ))}
        </AnimatePresence>
      )}

      {/* Undo toast — anchored to bottom of picks area */}
      <div className="sticky bottom-4 flex justify-center pointer-events-none mt-4">
        <div className="pointer-events-auto">
          <AnimatePresence>
            {pendingUndo && (
              <UndoToast
                key={pendingUndo.jobId}
                decision={pendingUndo.decision}
                onUndo={handleUndo}
                onExpire={handleExpire}
                duration={undoDelayMs}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
