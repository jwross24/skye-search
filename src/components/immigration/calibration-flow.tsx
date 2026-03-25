'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CalibrationFlowProps {
  onComplete: (daysUsed: number, dsoConfirmed: boolean) => void
  initialDaysUsed?: number
}

export function CalibrationFlow({ onComplete, initialDaysUsed }: CalibrationFlowProps) {
  const [daysUsed, setDaysUsed] = useState(initialDaysUsed?.toString() ?? '')
  const [dsoConfirmed, setDsoConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(daysUsed, 10)

    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a number between 0 and 150')
      return
    }
    if (parsed > 150) {
      setError('Maximum is 150 days')
      return
    }

    setError(null)
    onComplete(parsed, dsoConfirmed)
  }

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
      data-testid="calibration-flow"
    >
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground">
          Set your starting point
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
          How many unemployment days have you already used? Your DSO can
          provide the official count, or you can estimate and update later.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Days used input */}
        <div>
          <label
            htmlFor="days-used"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Days already used
          </label>
          <div className="flex items-baseline gap-2">
            <input
              id="days-used"
              type="number"
              min={0}
              max={150}
              value={daysUsed}
              onChange={(e) => {
                setDaysUsed(e.target.value)
                setError(null)
              }}
              className="w-24 rounded-lg border border-border bg-background px-3 py-2.5 text-2xl font-semibold text-foreground tabular-nums focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
              placeholder="0"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">of 150</span>
          </div>
          {error && (
            <p className="mt-2 text-sm text-amber-warm">{error}</p>
          )}
        </div>

        {/* DSO confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={dsoConfirmed}
            onChange={(e) => setDsoConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border text-ocean focus:ring-ocean/20"
          />
          <div>
            <span className="text-sm text-foreground group-hover:text-foreground/80">
              Confirmed by my DSO
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check this if your Designated School Official provided this number.
              Leave unchecked if you&apos;re estimating.
            </p>
          </div>
        </label>

        <Button
          type="submit"
          className="bg-ocean text-white hover:bg-ocean-deep"
        >
          Set my clock
        </Button>
      </form>
    </div>
  )
}
