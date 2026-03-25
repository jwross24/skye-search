'use client'

/**
 * The two most important numbers in Skye's life right now.
 * Designed to feel like a trusted compass, not a countdown timer.
 *
 * Color coding: jade at 90+, ocean at 60+, amber-warm at 30+, deep amber below 30.
 * NEVER red.
 */

interface ClockDisplayProps {
  daysRemaining: number
  optExpiry: string // ISO date
  today: string // ISO date
  isEmployed: boolean
  dataSource: 'dso_confirmed' | 'user_reported'
}

function getDaysColor(days: number): string {
  if (days >= 90) return 'text-jade'
  if (days >= 60) return 'text-ocean'
  if (days >= 30) return 'text-amber-warm'
  return 'text-amber-warm'
}

function getDaysLabel(days: number, isEmployed: boolean): string {
  if (isEmployed) return 'Clock paused while employed'
  if (days >= 90) return 'Comfortable runway'
  if (days >= 60) return 'Time to be intentional'
  if (days >= 30) return 'Every week matters'
  return 'Seek bridge employment'
}

function getExpiryDays(optExpiry: string, today: string): number {
  const expiry = new Date(optExpiry + 'T00:00:00Z')
  const now = new Date(today + 'T00:00:00Z')
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function ClockDisplay({
  daysRemaining,
  optExpiry,
  today,
  isEmployed,
  dataSource,
}: ClockDisplayProps) {
  const daysColor = getDaysColor(daysRemaining)
  const daysLabel = getDaysLabel(daysRemaining, isEmployed)
  const expiryDays = getExpiryDays(optExpiry, today)

  return (
    <div
      className="animate-in fade-in duration-500"
      data-testid="clock-display"
    >
      {/* Primary number: unemployment days */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-2">
          Unemployment days remaining
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-5xl sm:text-6xl font-semibold tracking-tight ${daysColor}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            data-testid="days-remaining"
          >
            {daysRemaining}
          </span>
          <span className="text-lg text-muted-foreground/70">
            / 150
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {daysLabel}
        </p>
        {isEmployed && (
          <p className="mt-1 text-xs text-jade">
            Active employment stops the clock
          </p>
        )}
        {dataSource === 'user_reported' && (
          <p className="mt-1 text-xs text-muted-foreground/60">
            Based on your estimate — confirm with DSO for official count
          </p>
        )}
      </div>

      {/* Secondary number: OPT expiry */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-2">
          STEM OPT expires
        </p>
        <p
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
          data-testid="opt-expiry"
        >
          {formatDate(optExpiry)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {expiryDays} days from now
        </p>
      </div>

      {/* Context — what these numbers mean together */}
      <div className="border-l-2 border-jade/30 pl-4 py-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isEmployed
            ? 'Your unemployment clock is paused while you hold qualifying employment. It resumes when employment ends.'
            : daysRemaining >= 60
              ? 'Focus on cap-exempt positions — they can sponsor H1-B year-round without lottery.'
              : 'Consider bridge employment (20+ hrs/week at a cap-exempt employer) to pause the clock.'}
        </p>
      </div>
    </div>
  )
}

export { getDaysColor, getDaysLabel, getExpiryDays, formatDate }
