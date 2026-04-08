'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Calendar, Briefcase, Clock } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyRecapCardProps {
  weekLabel: string           // "Mar 31 – Apr 6"
  summaryText: string
  jobsReviewed: number
  applicationsSubmitted: number
  daysRemaining: number
  phase: string
}

// ─── Phase Badge ────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<string, { label: string; className: string }> = {
  launch: { label: 'Getting started', className: 'bg-ocean/10 text-ocean border-ocean/20' },
  active: { label: 'Building momentum', className: 'bg-jade/10 text-jade border-jade/20' },
  response: { label: 'Getting responses', className: 'bg-jade/10 text-jade border-jade/20' },
  pressure: { label: 'Focused push', className: 'bg-amber-warm/10 text-amber-warm border-amber-warm/20' },
}

function PhaseBadge({ phase }: { phase: string }) {
  const config = PHASE_CONFIG[phase] ?? {
    label: phase,
    className: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

// ─── Stat Item ──────────────────────────────────────────────────────────────

function StatItem({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`size-3.5 ${colorClass}`} aria-hidden />
      <span className="text-sm text-muted-foreground">
        <span className={`font-semibold ${colorClass}`}>{value}</span>{' '}
        {label}
      </span>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WeeklyRecapCard({
  weekLabel,
  summaryText,
  jobsReviewed,
  applicationsSubmitted,
  daysRemaining,
  phase,
}: WeeklyRecapCardProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <section
      className="mb-6 rounded-xl border border-border bg-card"
      aria-label="Weekly recap"
      data-testid="weekly-recap-card"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/30 rounded-xl"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-ocean">Your week</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{weekLabel}</p>
          </div>
          <PhaseBadge phase={phase} />
        </div>
        <span className="ml-4 shrink-0 text-muted-foreground" aria-hidden>
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-5 pb-4 space-y-4">
          {/* Summary */}
          <p className="text-sm text-foreground leading-relaxed">{summaryText}</p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <StatItem
              icon={Briefcase}
              label={jobsReviewed === 1 ? 'job reviewed' : 'jobs reviewed'}
              value={jobsReviewed}
              colorClass="text-jade"
            />
            <StatItem
              icon={Calendar}
              label={applicationsSubmitted === 1 ? 'application' : 'applications'}
              value={applicationsSubmitted}
              colorClass="text-jade"
            />
            <StatItem
              icon={Clock}
              label="days remaining"
              value={daysRemaining}
              colorClass="text-amber-warm"
            />
          </div>
        </div>
      )}
    </section>
  )
}
