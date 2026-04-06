'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { confirmEmployment } from '@/app/immigration/actions'

interface EmploymentConfirmationBannerProps {
  employerName: string | null
  lastConfirmedAt: string | null
  employmentActiveSince: string | null
}

function computeVisibility(lastConfirmedAt: string | null, employmentActiveSince: string | null) {
  const now = Date.now()
  const daysSinceConfirmed = lastConfirmedAt
    ? Math.floor((now - new Date(lastConfirmedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const daysSinceActive = employmentActiveSince
    ? Math.floor((now - new Date(employmentActiveSince).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const shouldShow = daysSinceConfirmed === null
    ? daysSinceActive >= 7
    : daysSinceConfirmed >= 30

  return { daysSinceConfirmed, shouldShow }
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
  const [{ daysSinceConfirmed, shouldShow }] = useState(
    () => computeVisibility(lastConfirmedAt, employmentActiveSince),
  )

  if (!shouldShow || state === 'done') return null

  const employer = employerName || 'your current employer'

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
        className="mb-6 rounded-xl border border-amber-warm/15 bg-amber-warm/5 px-4 py-4"
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
      className="mb-6 rounded-xl border border-amber-warm/15 bg-amber-warm/5 px-4 py-4"
      role="alert"
      data-testid="employment-confirmation-banner"
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        Is your bridge role at {employer} still active?
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        {daysSinceConfirmed !== null
          ? `Last confirmed ${daysSinceConfirmed} days ago. Your clock is paused while employed.`
          : 'Your clock is paused while employed. Confirming helps keep your records accurate.'}
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
