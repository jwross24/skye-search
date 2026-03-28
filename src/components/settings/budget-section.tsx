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

  let barColor = 'bg-emerald-500'
  let statusText = ''
  if (pct >= 100) {
    barColor = 'bg-red-400'
    statusText = 'Paused for today'
  } else if (pct >= 80) {
    barColor = 'bg-amber-400'
    statusText = 'Getting close'
  } else if (pct >= 50) {
    barColor = 'bg-amber-300'
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="text-stone-500">
          ${dollars} / ${capDollars}
          {statusText && <span className="ml-2 text-amber-600">{statusText}</span>}
        </span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
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
    <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">Your API spend</h2>
        <p className="text-sm text-stone-500 mt-1">
          Searches and document analysis use paid APIs. These limits keep costs predictable.
        </p>
      </div>

      <div className="space-y-4">
        <SpendBar label="Today" cents={dailyCents} capCents={dailyCapCents} />
        <SpendBar label="This week" cents={weeklyCents} capCents={weeklyCapCents} />
      </div>

      <div className="border-t border-stone-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Spend limits</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-stone-500">Daily cap</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500">Weekly cap</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number"
                step="1.00"
                min="1.00"
                value={weeklyCap}
                onChange={(e) => setWeeklyCap(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500">Alert at</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number"
                step="1.00"
                min="1.00"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save limits'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  )
}
