'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { confirmEmployment } from '@/app/immigration/actions'
import { getEscalationLevel, getEscalationCopy } from '@/lib/employment-escalation'
import type { EscalationLevel } from '@/lib/employment-escalation'

interface EmploymentConfirmationBannerProps {
  employerName: string | null
  lastConfirmedAt: string | null
  employmentActiveSince: string | null
}

function computeEscalation(lastConfirmedAt: string | null, employmentActiveSince: string | null) {
  const now = Date.now()
  const daysSinceConfirmed = lastConfirmedAt
    ? Math.floor((now - new Date(lastConfirmedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const daysSinceActive = employmentActiveSince
    ? Math.floor((now - new Date(employmentActiveSince).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const level = getEscalationLevel(daysSinceConfirmed, daysSinceActive)

  return { daysSinceConfirmed, level }
}

/** Returns border/background intensity classes based on escalation level. */
function getEscalationStyles(level: EscalationLevel) {
  switch (level) {
    case 'day7':
    case 'day14':
      return 'border-amber-warm/15 bg-amber-warm/5'
    case 'day30':
      return 'border-amber-warm/20 bg-amber-warm/8'
    case 'day45':
      return 'border-amber-warm/25 bg-amber-warm/10'
    case 'day60':
      return 'border-amber-warm/30 bg-amber-warm/12'
    default:
      return 'border-amber-warm/15 bg-amber-warm/5'
  }
}

export function EmploymentConfirmationBanner({
  employerName,
  lastConfirmedAt,
  employmentActiveSince,
}: EmploymentConfirmationBannerProps) {
  const [state, setState] = useState<'prompt' | 'end-date' | 'confirming' | 'done'>('prompt')
  const [endDate, setEndDate] = useState('')

  // Compute once on initial render via lazy initializer to avoid
  // react-hooks/purity lint errors from Date.now() in render body
  const [{ daysSinceConfirmed, level }] = useState(
    () => computeEscalation(lastConfirmedAt, employmentActiveSince),
  )

  if (level === 'none' || state === 'done') return null

  const employer = employerName || 'your current employer'
  const copy = getEscalationCopy(level, employer)
  const escalationStyles = getEscalationStyles(level)

  async function handleConfirm() {
    setState('confirming')
    const result = await confirmEmployment(true)
    if (result?.success === false) {
      setState('prompt')
      toast.error("Couldn't save your confirmation. Try again in a moment.")
      return
    }
    setState('done')
  }

  async function handleEnded() {
    if (state === 'prompt') {
      setState('end-date')
      return
    }
    // Submit end date
    setState('confirming')
    const result = await confirmEmployment(false, endDate || undefined)
    if (result?.success === false) {
      setState('end-date')
      toast.error("Couldn't update your employment status. Try again in a moment.")
      return
    }
    setState('done')
  }

  if (state === 'end-date') {
    return (
      <div
        className={`mb-6 rounded-xl border px-4 py-4 ${escalationStyles}`}
        role="region"
        aria-label="Employment end date form"
        data-testid="employment-confirmation-banner"
      >
        <p className="mb-3 text-sm font-medium text-foreground">
          When did your role at {employer} end?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            max={new Date().toISOString().split('T')[0]}
            aria-label="Employment end date"
          />
          <button
            onClick={handleEnded}
            disabled={!endDate}
            className="rounded-lg bg-amber-warm/20 px-4 py-2 text-sm font-medium text-amber-warm transition-colors hover:bg-amber-warm/30 disabled:opacity-50"
          >
            Submit
          </button>
          <button
            onClick={() => setState('prompt')}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-4 ${escalationStyles}`}
      role="alert"
      data-testid="employment-confirmation-banner"
      data-escalation-level={level}
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        {copy.banner}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        {daysSinceConfirmed !== null
          ? `Last confirmed ${daysSinceConfirmed} days ago. ${copy.detail}`
          : `Your clock is paused while employed. ${copy.detail}`}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={state === 'confirming'}
          className="rounded-lg bg-jade/20 px-4 py-2 text-sm font-medium text-jade transition-colors hover:bg-jade/30 disabled:opacity-50"
        >
          Yes, still active
        </button>
        <button
          onClick={handleEnded}
          disabled={state === 'confirming'}
          className="rounded-lg bg-amber-warm/20 px-4 py-2 text-sm font-medium text-amber-warm transition-colors hover:bg-amber-warm/30 disabled:opacity-50"
        >
          No, it ended
        </button>
      </div>
    </div>
  )
}
