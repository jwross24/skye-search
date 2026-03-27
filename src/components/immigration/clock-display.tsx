'use client'

/**
 * The two most important numbers in Skye's life right now.
 * Designed to feel like a trusted compass, not a countdown timer.
 *
 * Color coding: jade at 90+, ocean at 60+, amber-warm at 30+, deep amber below 30.
 * NEVER red.
 */

import { ProgressArc } from './progress-arc'

interface ClockDisplayProps {
  daysRemaining: number
  optExpiry: string // ISO date
  today: string // ISO date
  isEmployed: boolean
  dataSource: 'dso_confirmed' | 'user_reported'
  /** If true, STEM OPT is expired AND not employed → grace period */
  isGracePeriod?: boolean
  /** Current employment status label (from cron) */
  statusLabel?: string
  /** Date employment was halted since */
  haltedSince?: string | null
  /** Source of the halt (kanban or manual) */
  haltSource?: string | null
  /** Timestamp of last successful cron run */
  lastCronRun?: string | null
  /** Any gap alert message */
  gapAlert?: string | null
}

function getDaysColor(days: number): string {
  if (days >= 90) return 'text-jade'
  if (days >= 60) return 'text-ocean'
  if (days >= 30) return 'text-amber-warm'
  return 'text-amber-warm'
}

function getDaysColorVar(days: number): string {
  if (days >= 90) return 'jade'
  if (days >= 60) return 'ocean'
  return 'amber-warm'
}

function getDaysLabel(days: number, isEmployed: boolean): string {
  if (isEmployed) return 'Clock paused while employed'
  if (days <= 0) return 'Clock exhausted — talk to your attorney'
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function ClockDisplay({
  daysRemaining,
  optExpiry,
  today,
  isEmployed,
  dataSource,
  isGracePeriod = false,
  statusLabel,
  haltedSince,
  haltSource,
  lastCronRun,
  gapAlert,
}: ClockDisplayProps) {
  const daysColor = getDaysColor(daysRemaining)
  const arcColor = getDaysColorVar(daysRemaining)
  const daysLabel = getDaysLabel(daysRemaining, isEmployed)
  const expiryDays = getExpiryDays(optExpiry, today)
  // ── Clock 4: Exhaustion view (150 days used) ──────────────────────────────
  if (daysRemaining <= 0 && !isEmployed) {
    return (
      <div data-testid="clock-display" data-view="exhaustion">
        <div className="text-center py-8" data-testid="exhaustion-view">
          <p className="text-4xl font-semibold text-amber-warm mb-3">150</p>
          <p className="text-sm text-foreground mb-6">
            All unemployment days have been used
          </p>
          <div className="grid gap-3 max-w-sm mx-auto">
            <ExhaustionCard
              title="SEVIS Transfer"
              description="Transfer to a new program to maintain F-1 status"
            />
            <ExhaustionCard
              title="Contact your DSO"
              description="Your Designated School Official can advise on immediate options"
            />
            <ExhaustionCard
              title="Consult an attorney"
              description="An immigration attorney can review your full situation"
            />
          </div>
        </div>
        <Footer lastCronRun={lastCronRun} />
      </div>
    )
  }

  // ── Clock 3: Grace Period view ─────────────────────────────────────────────
  if (isGracePeriod) {
    // Grace period: 60 days from OPT expiry
    const graceDaysElapsed = Math.abs(expiryDays) // expiryDays is negative when expired
    const graceDaysRemaining = Math.max(0, 60 - graceDaysElapsed)

    return (
      <div data-testid="clock-display" data-view="grace-period">
        <div className="mb-10" data-testid="grace-period-view">
          <ProgressArc
            fraction={graceDaysRemaining / 60}
            color="ocean"
            size={140}
            label={`${graceDaysRemaining} of 60 grace period days remaining`}
          >
            <span className="text-2xl font-semibold text-ocean">{graceDaysRemaining}</span>
            <span className="text-xs text-muted-foreground">of 60 days</span>
          </ProgressArc>
          <p className="text-sm text-foreground mt-4">
            Your STEM OPT has expired. You have a 60-day grace period to
            depart, transfer SEVIS, or change status.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Grace period is not work authorization. Contact your DSO immediately.
          </p>
        </div>
        <Footer lastCronRun={lastCronRun} />
      </div>
    )
  }

  // ── Normal view: Clock 1 + Clock 2 ────────────────────────────────────────
  return (
    <div
      className="animate-in fade-in duration-500"
      data-testid="clock-display"
      data-view="normal"
    >
      {/* Persistent banner at <15 days */}
      {daysRemaining > 0 && daysRemaining < 15 && !isEmployed && (
        <div
          className="mb-6 px-4 py-3 rounded-xl bg-amber-warm/5 border border-amber-warm/15"
          data-testid="low-days-banner"
          role="alert"
        >
          <p className="text-sm text-foreground leading-relaxed">
            You have <strong>{daysRemaining}</strong> unemployment days remaining.
            Let&apos;s review your options together.
          </p>
        </div>
      )}

      {/* Gap alert */}
      {gapAlert && (
        <div
          className="mb-6 px-4 py-3 rounded-xl bg-amber-warm/5 border border-amber-warm/15"
          data-testid="gap-alert"
          role="alert"
        >
          <p className="text-sm text-amber-warm">{gapAlert}</p>
        </div>
      )}

      {/* Clock 1: Unemployment days with progress arc */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-4">
          Unemployment days remaining
        </p>
        <div className="flex items-center gap-6">
          <ProgressArc
            fraction={daysRemaining / 150}
            color={isEmployed ? 'jade' : arcColor}
            size={140}
            label={`${daysRemaining} of 150 unemployment days remaining. ${daysLabel}`}
          >
            <span
              className={`text-3xl font-semibold tracking-tight tabular-nums ${daysColor}`}
              data-testid="days-remaining"
              aria-label={`${daysRemaining} of 150 unemployment days remaining. ${daysLabel}`}
            >
              {daysRemaining}
            </span>
            <span className="text-xs text-muted-foreground/70">of 150</span>
          </ProgressArc>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
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
        </div>
      </div>

      {/* Clock 2: STEM OPT expiry with progress arc */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-4">
          STEM OPT valid through
        </p>
        <div className="flex items-center gap-6">
          <ProgressArc
            fraction={Math.max(0, expiryDays / 365)}
            color="ocean"
            size={120}
            label={expiryDays > 0
              ? `STEM OPT valid for ${expiryDays} more days, expires ${formatDate(optExpiry)}`
              : `STEM OPT expired ${formatDate(optExpiry)}`}
          >
            <span className="text-2xl font-semibold tracking-tight text-ocean tabular-nums">
              {expiryDays > 0 ? expiryDays : 0}
            </span>
            <span className="text-[10px] text-muted-foreground/70">days</span>
          </ProgressArc>
          <div className="flex-1">
            <p
              className="text-lg font-semibold tracking-tight text-foreground"
              data-testid="opt-expiry"
            >
              {formatDate(optExpiry)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {expiryDays > 0
                ? `Valid for ${expiryDays} more days`
                : 'Expired'}
            </p>
          </div>
        </div>
      </div>

      {/* Employment status */}
      {statusLabel && (
        <div className="mb-8 px-4 py-3 rounded-xl bg-card" data-testid="employment-status">
          <p className="text-sm text-foreground">
            Status: <span className="font-medium">{statusLabel}</span>
          </p>
          {haltedSince && (
            <p className="text-xs text-muted-foreground mt-1">
              Clock halted since {formatDate(haltedSince)}
              {haltSource && ` — ${haltSource}`}
            </p>
          )}
        </div>
      )}

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

      <Footer lastCronRun={lastCronRun} />
    </div>
  )
}

function ExhaustionCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-card text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

function Footer({ lastCronRun }: { lastCronRun?: string | null }) {
  return (
    <div className="mt-8 pt-4 border-t border-border/30">
      {lastCronRun && (
        <p className="text-xs text-muted-foreground/50 mb-1" data-testid="cron-timestamp">
          Last verified: {formatTimestamp(lastCronRun)}
        </p>
      )}
    </div>
  )
}

export { getDaysColor, getDaysColorVar, getDaysLabel, getExpiryDays, formatDate, formatTimestamp }
