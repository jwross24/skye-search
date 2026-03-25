'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import type { SeedPlan } from '@/db/seed'

interface StrategyMapProps {
  plans: SeedPlan[]
  daysRemaining: number
  optExpiryDate: string
  today: string
}

const PLAN_LABELS: Record<string, { name: string; shortName: string; icon: string }> = {
  plan_a: { name: 'Cap-Exempt H1-B + O-1A', shortName: 'Plan A', icon: 'A' },
  plan_b: { name: 'Bridge Employment', shortName: 'Plan B', icon: 'B' },
  plan_c: { name: 'Day 1 CPT', shortName: 'Plan C', icon: 'C' },
  plan_d: { name: 'Canada Express Entry', shortName: 'Plan D', icon: 'D' },
  niw: { name: 'EB-2 NIW (Green Card)', shortName: 'NIW', icon: 'N' },
}

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-jade/10 text-jade' },
  not_started: { label: 'Not started', className: 'bg-muted text-muted-foreground' },
  completed: { label: 'Completed', className: 'bg-ocean/10 text-ocean' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground/60 line-through' },
}

function getDecisionAlert(
  planId: string,
  daysRemaining: number,
  optExpiryDate: string,
  today: string,
): string | null {
  const optExpiryDays = Math.ceil(
    (new Date(optExpiryDate + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime())
    / (1000 * 60 * 60 * 24),
  )

  if (planId === 'plan_a' && daysRemaining < 90 && daysRemaining > 0) {
    return 'Fewer than 90 unemployment days left. If Plan A hasn\'t landed, activate Plan B or C soon.'
  }
  if (planId === 'plan_c' && optExpiryDays < 150 && optExpiryDays > 0) {
    return 'STEM OPT runs through August. If Plan A hasn\'t landed by June, it\'s time to apply to Day 1 CPT programs.'
  }
  return null
}

export function StrategyMap({ plans, daysRemaining, optExpiryDate, today }: StrategyMapProps) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)

  const togglePlan = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId)
  }

  return (
    <div data-testid="strategy-map">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">
        Immigration strategy
      </h2>
      <div className="space-y-2">
        {plans.map((plan) => {
          const meta = PLAN_LABELS[plan.id] ?? {
            name: plan.id,
            shortName: plan.id,
            icon: '?',
          }
          const status = STATUS_DISPLAY[plan.status] ?? STATUS_DISPLAY.not_started
          const isExpanded = expandedPlan === plan.id
          const alert = getDecisionAlert(plan.id, daysRemaining, optExpiryDate, today)

          return (
            <div key={plan.id} data-testid={`plan-${plan.id}`}>
              {/* Plan header — always visible */}
              <button
                type="button"
                onClick={() => togglePlan(plan.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card hover:bg-accent/50 transition-colors text-left"
                aria-expanded={isExpanded}
                aria-controls={`plan-detail-${plan.id}`}
              >
                {/* Plan icon */}
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-ocean/10 text-ocean text-sm font-semibold flex items-center justify-center">
                  {meta.icon}
                </span>
                {/* Plan info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {meta.shortName}: {meta.name}
                    </span>
                    {alert && (
                      <AlertTriangle className="size-3.5 text-amber-warm flex-shrink-0" />
                    )}
                  </div>
                  {plan.next_action && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {plan.next_action}
                    </p>
                  )}
                </div>
                {/* Status badge */}
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                  {status.label}
                </span>
                {/* Chevron */}
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4 text-muted-foreground" />
                </motion.span>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    id={`plan-detail-${plan.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 ml-11 space-y-3">
                      {/* Notes */}
                      {plan.notes && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {plan.notes}
                        </p>
                      )}

                      {/* Decision alert */}
                      {alert && (
                        <div
                          className="flex items-start gap-2 p-3 rounded-lg bg-amber-warm/5 border border-amber-warm/15"
                          data-testid={`alert-${plan.id}`}
                        >
                          <AlertTriangle className="size-4 text-amber-warm flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-relaxed">
                            {alert}
                          </p>
                        </div>
                      )}

                      {/* Cap-exempt trap disclosure (Plan A only) */}
                      {plan.id === 'plan_a' && plan.status === 'active' && (
                        <div
                          className="text-xs text-muted-foreground/80 border-l-2 border-ocean/20 pl-3 py-1"
                          data-testid="cap-exempt-trap"
                        >
                          Cap-exempt employers (universities, nonprofits, gov labs) can
                          sponsor H1-B year-round — no lottery needed. But &quot;affiliated
                          with&quot; a university is not the same as &quot;employed by&quot; one.
                          Verify cap-exempt status with an immigration attorney before
                          relying on it.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { getDecisionAlert, PLAN_LABELS, STATUS_DISPLAY }
