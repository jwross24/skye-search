'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { logCalibrationConfirmed, logCalibrationTooHigh } from '@/app/jobs/calibration-actions'
import type { CalibrationPick, CalibrationTag } from '@/lib/calibration-types'

interface CalibrationCardProps {
  picks: CalibrationPick[]
}

type RowState =
  | { status: 'pending' }
  | { status: 'tagging' }
  | { status: 'resolved'; label: string }
  | { status: 'error'; message: string }

const CALIBRATION_TAGS: { value: CalibrationTag; label: string }[] = [
  { value: 'wrong_visa', label: 'Wrong visa path' },
  { value: 'stale', label: 'Stale posting' },
  { value: 'wrong_field', label: 'Wrong field' },
  { value: 'other', label: 'Other' },
]

/** Qualitative priority tier — Skye-facing label, not a raw score.
 *  Raw urgency_score is a diagnostic number; what she needs to feel is the ranking tier. */
function PriorityPill({ score }: { score: number }) {
  const tier =
    score >= 0.8
      ? { label: 'Top priority', className: 'bg-ocean/10 text-ocean border-ocean/20' }
      : score >= 0.6
        ? { label: 'Worth a look', className: 'bg-jade/10 text-jade border-jade/20' }
        : { label: 'Maybe', className: 'bg-muted text-muted-foreground border-border' }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tier.className}`}
    >
      {tier.label}
    </span>
  )
}

interface CalibrationRowProps {
  pick: CalibrationPick
  rowState: RowState
  onConfirmed: () => void
  onTooHighOpen: () => void
  onTagSelected: (tag: CalibrationTag) => void
  onDismissTag: () => void
  isPending: boolean
}

function CalibrationRow({
  pick,
  rowState,
  onConfirmed,
  onTooHighOpen,
  onTagSelected,
  onDismissTag,
  isPending,
}: CalibrationRowProps) {
  const isResolved = rowState.status === 'resolved'
  const isTagging = rowState.status === 'tagging'

  return (
    <li
      className={`py-4 transition-opacity duration-300 ${isResolved ? 'opacity-40' : 'opacity-100'}`}
      data-testid={`calibration-row-${pick.id}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        {/* Job details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground leading-snug">{pick.title}</span>
            <PriorityPill score={pick.urgency_score} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span>{pick.company}</span>
            {pick.location && (
              <>
                <span className="text-border">·</span>
                <span>{pick.location}</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Why it ranked high: {pick.primary_reason.toLowerCase()}</p>
          {pick.url && (
            <a
              href={pick.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ocean hover:text-ocean-deep transition-colors"
            >
              View posting <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0">
          {isResolved ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-jade" aria-hidden />
              <span>{rowState.status === 'resolved' ? rowState.label : 'Got it'}</span>
            </div>
          ) : rowState.status === 'error' ? (
            <p className="text-xs text-destructive">{rowState.message} — try again</p>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={onConfirmed}
                aria-label={`Good pick for ${pick.title}`}
                className="rounded-full border border-jade/30 bg-jade/10 px-3 py-1 text-xs font-medium text-jade transition-colors hover:bg-jade/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40 active:scale-95 disabled:opacity-50"
              >
                Good pick
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={onTooHighOpen}
                aria-label={`Missed the mark for ${pick.title}`}
                aria-expanded={isTagging}
                aria-controls={isTagging ? `tag-picker-${pick.id}` : undefined}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border active:scale-95 disabled:opacity-50"
              >
                Missed the mark
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline tag picker — not a modal */}
      {isTagging && (
        <div
          id={`tag-picker-${pick.id}`}
          className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150"
          role="group"
          aria-label="Why wasn't this a good pick?"
        >
          <p className="mb-2 text-xs text-muted-foreground">What was off?</p>
          <div className="flex flex-wrap gap-2">
            {CALIBRATION_TAGS.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={isPending}
                onClick={() => onTagSelected(t.value)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-ocean/30 hover:bg-ocean/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/30 active:scale-95 disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onDismissTag}
              className="rounded-full px-3 py-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function CalibrationCard({ picks }: CalibrationCardProps) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(
    () => Object.fromEntries(picks.map((p) => [p.id, { status: 'pending' }])),
  )
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const resolvedCount = Object.values(rowStates).filter((s) => s.status === 'resolved').length
  const allResolved = resolvedCount === picks.length

  function setRow(id: string, state: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: state }))
  }

  function handleConfirmed(pick: CalibrationPick) {
    // Optimistic update — quiet confirmation, no AI-voice thanks
    setRow(pick.id, { status: 'resolved', label: 'Logged' })
    startTransition(async () => {
      const result = await logCalibrationConfirmed(pick.id)
      if (!result.success) {
        // Roll back
        setRow(pick.id, { status: 'error', message: result.error ?? 'Something went wrong' })
      }
    })
  }

  function handleTooHighOpen(pick: CalibrationPick) {
    setRow(pick.id, { status: 'tagging' })
  }

  function handleTagSelected(pick: CalibrationPick, tag: CalibrationTag) {
    // Optimistic update — echo the tag so Skye sees which reason landed
    const tagLabel = CALIBRATION_TAGS.find((t) => t.value === tag)?.label ?? tag
    setRow(pick.id, { status: 'resolved', label: tagLabel })
    startTransition(async () => {
      const result = await logCalibrationTooHigh(pick.id, tag)
      if (!result.success) {
        setRow(pick.id, { status: 'error', message: result.error ?? 'Something went wrong' })
      }
    })
  }

  function handleDismissTag(pick: CalibrationPick) {
    // User skipped the tag — log as 'too_high' with 'other'
    setRow(pick.id, { status: 'resolved', label: 'Logged' })
    startTransition(async () => {
      const result = await logCalibrationTooHigh(pick.id, 'other')
      if (!result.success) {
        setRow(pick.id, { status: 'error', message: result.error ?? 'Something went wrong' })
      }
    })
  }

  if (allResolved && !collapsed) {
    return (
      <div className="mb-6 rounded-xl border border-jade/20 bg-jade/5 px-5 py-4">
        <p className="text-sm font-medium text-jade">All five. See you next Sunday.</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your picks will be sharper next week.
        </p>
      </div>
    )
  }

  return (
    <section
      className="mb-6 rounded-xl border border-border bg-card"
      aria-label="Sunday check-in"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/30 rounded-xl"
        aria-expanded={!collapsed}
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">Sunday check-in</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here are this week&apos;s five highest-priority picks. Did they feel right?
            Two minutes — your feedback here becomes next week&apos;s picks.
          </p>
        </div>
        <span className="ml-4 shrink-0 text-muted-foreground" aria-hidden>
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {/* Picks list */}
      {!collapsed && (
        <div className="px-5 pb-4">
          <ul
            className="divide-y divide-border"
            aria-label="Calibration picks"
          >
            {picks.map((pick) => (
              <CalibrationRow
                key={pick.id}
                pick={pick}
                rowState={rowStates[pick.id] ?? { status: 'pending' }}
                onConfirmed={() => handleConfirmed(pick)}
                onTooHighOpen={() => handleTooHighOpen(pick)}
                onTagSelected={(tag) => handleTagSelected(pick, tag)}
                onDismissTag={() => handleDismissTag(pick)}
                isPending={isPending}
              />
            ))}
          </ul>

          {resolvedCount > 0 && resolvedCount < picks.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              {picks.length - resolvedCount} left
            </p>
          )}
        </div>
      )}
    </section>
  )
}
