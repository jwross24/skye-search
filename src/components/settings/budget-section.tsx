'use client'

import { useState } from 'react'
import { updateBudgetCaps } from '@/app/settings/actions'

interface BudgetSectionProps {
  dailyCents: number
  weeklyCents: number
  dailyCapCents: number
  weeklyCapCents: number
  weeklyAlertCents: number
}

function SpendBar({ label, cents, capCents }: { label: string; cents: number; capCents: number }) {
  const pct = capCents > 0 ? Math.min(100, (cents / capCents) * 100) : 0
  const dollars = (cents / 100).toFixed(2)
  const capDollars = (capCents / 100).toFixed(2)

  // Brand colors: jade for healthy, amber-warm for attention, never red
  let barClass = 'bg-jade'
  let statusText = ''
  if (pct >= 100) {
    barClass = 'bg-amber-warm'
    statusText = 'Paused for today'
  } else if (pct >= 80) {
    barClass = 'bg-amber-warm/80'
    statusText = 'Getting close'
  } else if (pct >= 50) {
    barClass = 'bg-ocean-light'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-foreground/70">{label}</span>
        <span className="text-sm tabular-nums text-foreground/50">
          ${dollars}
          <span className="text-foreground/30"> / ${capDollars}</span>
          {statusText && (
            <span className="ml-2 text-amber-warm text-xs font-medium">{statusText}</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function BudgetSection({
  dailyCents,
  weeklyCents,
  dailyCapCents,
  weeklyCapCents,
  weeklyAlertCents,
}: BudgetSectionProps) {
  const [dailyCap, setDailyCap] = useState(dailyCapCents / 100)
  const [weeklyCap, setWeeklyCap] = useState(weeklyCapCents / 100)
  const [alertThreshold, setAlertThreshold] = useState(weeklyAlertCents / 100)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await updateBudgetCaps({
      dailyCapCents: Math.round(dailyCap * 100),
      weeklyCapCents: Math.round(weeklyCap * 100),
      weeklyAlertCents: Math.round(alertThreshold * 100),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Your API spend</h2>
        <p className="text-sm text-foreground/50 mt-1 leading-relaxed">
          Job searches and document analysis use paid APIs.
          These limits keep things predictable so there are no surprises.
        </p>
      </div>

      <div className="space-y-4">
        <SpendBar label="Today" cents={dailyCents} capCents={dailyCapCents} />
        <SpendBar label="This week" cents={weeklyCents} capCents={weeklyCapCents} />
      </div>

      <div className="border-t border-foreground/5 pt-5 space-y-3">
        <h3 className="text-sm font-medium text-foreground/60">Spend limits</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Daily cap', value: dailyCap, onChange: setDailyCap, step: '0.50', min: '0.50' },
            { label: 'Weekly cap', value: weeklyCap, onChange: setWeeklyCap, step: '1.00', min: '1.00' },
            { label: 'Alert at', value: alertThreshold, onChange: setAlertThreshold, step: '1.00', min: '1.00' },
          ].map(({ label, value, onChange, step, min }) => (
            <div key={label}>
              <label className="text-xs text-foreground/40">{label}</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 text-sm">$</span>
                <input
                  type="number"
                  step={step}
                  min={min}
                  value={value}
                  onChange={(e) => onChange(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-foreground/10 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ocean/40 focus:border-ocean/40 transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-ocean text-white rounded-lg hover:bg-ocean-deep disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save limits'}
          </button>
          {saved && (
            <span className="text-sm text-jade animate-in fade-in duration-300">
              Saved
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
