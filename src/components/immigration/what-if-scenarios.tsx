import { Shield, Briefcase, Clock, AlertTriangle } from 'lucide-react'
import type { ScenarioResult } from '@/lib/what-if-scenarios'

// ─── Tone → Style Mapping ───────────────────────────────────────────────────

const TONE_STYLES: Record<ScenarioResult['tone'], { border: string; icon: string; bg: string }> = {
  reassuring: { border: 'border-jade/20', icon: 'text-jade', bg: 'bg-jade/5' },
  encouraging: { border: 'border-ocean/20', icon: 'text-ocean', bg: 'bg-ocean/5' },
  actionable: { border: 'border-amber-warm/20', icon: 'text-amber-warm', bg: 'bg-amber-warm/5' },
  urgent: { border: 'border-amber-warm/30', icon: 'text-amber-warm', bg: 'bg-amber-warm/5' },
}

const SCENARIO_ICONS: Record<ScenarioResult['id'], typeof Shield> = {
  cap_exempt_may: Shield,
  bridge_may: Briefcase,
  nothing_june: Clock,
  nothing_august: AlertTriangle,
}

// ─── Scenario Card ──────────────────────────────────────────────────────────

function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  const style = TONE_STYLES[scenario.tone]
  const Icon = SCENARIO_ICONS[scenario.id]

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} px-5 py-4`}
      data-testid={`scenario-${scenario.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${style.icon}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">
            {scenario.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scenario.subtitle}
          </p>

          {/* Projected outcome */}
          <p className="text-xs text-foreground/80 tabular-nums mt-3">
            {scenario.projectedStatus}
          </p>
          <p className="text-[13px] text-foreground/90 leading-relaxed mt-2">
            {scenario.recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface WhatIfScenariosProps {
  scenarios: ScenarioResult[]
  daysUsed: number
}

export function WhatIfScenarios({ scenarios, daysUsed }: WhatIfScenariosProps) {
  if (scenarios.length === 0) {
    return (
      <div className="py-12 text-center" data-testid="what-if-empty">
        <p className="text-sm text-muted-foreground">
          Complete your immigration calibration first
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          We need your current unemployment days to project scenarios
        </p>
      </div>
    )
  }

  return (
    <div data-testid="what-if-scenarios">
      <p className="text-sm text-muted-foreground mb-5">
        Starting from {daysUsed} days used — here&apos;s how each path plays out
      </p>

      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/50 mt-6">
        Projections based on current immigration state. Dates are approximate — always verify with your DSO or attorney.
      </p>
    </div>
  )
}
