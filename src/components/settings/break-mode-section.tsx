'use client'

import { useState } from 'react'
import { Coffee, Loader2, Sun } from 'lucide-react'
import { activateBreakMode, deactivateBreakMode } from '@/app/settings/actions'

interface BreakModeSectionProps {
  breakModeUntil: string | null
  daysRemaining: number | null
}

const DURATION_OPTIONS = [1, 2, 3, 5, 7]

export function BreakModeSection({ breakModeUntil, daysRemaining }: BreakModeSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOnBreak = breakModeUntil && new Date(breakModeUntil) > new Date()
  const breakEnds = isOnBreak ? new Date(breakModeUntil) : null

  // Safety thresholds
  const isUrgent = daysRemaining !== null && daysRemaining <= 15
  const isWarning = daysRemaining !== null && daysRemaining <= 30

  // Limit to 2 days when <15 days remaining
  const maxDays = isUrgent ? 2 : 7
  const availableOptions = DURATION_OPTIONS.filter(d => d <= maxDays)

  // Default selection must respect maxDays (urgent users get max 2 days)
  const defaultDays = Math.min(3, maxDays)
  const [selectedDays, setSelectedDays] = useState(defaultDays)

  const handleActivate = async () => {
    setLoading(true)
    setError(null)
    const result = await activateBreakMode(selectedDays)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Try again.')
      return
    }
    setShowConfirm(false)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    setError(null)
    const result = await deactivateBreakMode()
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Try again.')
    }
  }

  if (isOnBreak) {
    const formattedEnd = breakEnds!.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    return (
      <section id="break-mode" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Taking a Break</h2>
        <div className="rounded-xl bg-ocean/5 border border-ocean/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Coffee className="h-5 w-5 text-ocean mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground">
                Your break runs until {formattedEnd}.
              </p>
              <p className="text-xs text-foreground/50 mt-1">
                Daily picks and non-urgent notifications are paused.
                Deadline alerts and critical immigration updates still come through.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-jade/10 text-jade px-3 py-2 text-sm font-medium transition-colors hover:bg-jade/20 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            I&apos;m ready to come back
          </button>
          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section id="break-mode" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Take a Break</h2>
      <p className="text-sm text-foreground/60 leading-relaxed">
        Pause daily picks and notifications. Your data keeps updating in the background
        — nothing is lost. Deadline alerts always come through.
      </p>

      {showConfirm ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          {/* Duration picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">How long?</p>
            <div className="flex gap-2">
              {availableOptions.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDays(d)}
                  aria-pressed={selectedDays === d}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors
                    ${selectedDays === d
                      ? 'bg-ocean text-white'
                      : 'bg-accent/50 text-foreground/70 hover:bg-accent'
                    }`}
                  data-testid={`break-${d}d`}
                >
                  {d} day{d !== 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Safety warning */}
          {isWarning && (
            <div className="rounded-lg bg-amber-warm/10 border border-amber-warm/20 p-3">
              <p className="text-sm text-foreground">
                {isUrgent ? (
                  <>
                    You have <strong>{daysRemaining} days</strong> remaining on your clock.
                    I&apos;ll pause notifications for up to {maxDays} days, but critical
                    alerts will still come through.
                  </>
                ) : (
                  <>
                    You have <strong>{daysRemaining} days</strong> left on your unemployment clock.
                    Taking a break means notifications pause, but your clock keeps running.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-deep disabled:opacity-60"
              data-testid="confirm-break"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coffee className="h-4 w-4" />
              )}
              Start break
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              Never mind
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:border-ocean/30 hover:text-foreground hover:bg-ocean/5"
          data-testid="break-mode-toggle"
        >
          <Coffee className="h-4 w-4" />
          Take a break
        </button>
      )}
    </section>
  )
}
