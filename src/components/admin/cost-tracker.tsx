'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface CostData {
  dailyCosts: Record<string, Record<string, number>>
  totalCostCents: number
  totalInputTokens: number
  totalOutputTokens: number
  modelBreakdown: Record<string, { cost: number; calls: number }>
  budget: {
    dailyCostCents: number
    dailyCapCents: number
    weeklyCostCents: number
    weeklyCapCents: number
  }
}

function BudgetBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min((used / cap) * 100, 100)
  const color = pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">${(used / 100).toFixed(2)} / ${(cap / 100).toFixed(2)}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CostTracker() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/costs?range=30d')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">API Costs</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 bg-zinc-800" /></CardContent>
      </Card>
    )
  }

  // Last 14 days for the mini chart
  const days = Object.keys(data.dailyCosts).sort().slice(-14)
  const maxDailyCost = Math.max(...days.map(d => Object.values(data.dailyCosts[d] ?? {}).reduce((a, b) => a + b, 0)), 1)

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-300">API Costs</CardTitle>
          <span className="text-xl font-mono font-semibold text-zinc-100">
            ${(data.totalCostCents / 100).toFixed(2)}
            <span className="text-xs text-zinc-500 ml-1">30d</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget bars */}
        <div className="space-y-3">
          <BudgetBar label="Today" used={data.budget.dailyCostCents} cap={data.budget.dailyCapCents} />
          <BudgetBar label="This week" used={data.budget.weeklyCostCents} cap={data.budget.weeklyCapCents} />
        </div>

        {/* Mini bar chart */}
        <div>
          <p className="text-xs text-zinc-500 font-mono mb-2">Daily cost (14d)</p>
          <div className="flex items-end gap-1 h-16">
            {days.map(day => {
              const total = Object.values(data.dailyCosts[day] ?? {}).reduce((a, b) => a + b, 0)
              const height = Math.max((total / maxDailyCost) * 100, 2)
              return (
                <div
                  key={day}
                  className="flex-1 bg-sky-500/60 hover:bg-sky-400/80 rounded-t transition-colors cursor-default"
                  style={{ height: `${height}%` }}
                  title={`${day}: $${(total / 100).toFixed(2)}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-zinc-600 font-mono mt-1">
            <span>{days[0]?.slice(5)}</span>
            <span>{days[days.length - 1]?.slice(5)}</span>
          </div>
        </div>

        {/* Model breakdown */}
        <div>
          <p className="text-xs text-zinc-500 font-mono mb-2">By model</p>
          <div className="space-y-1">
            {Object.entries(data.modelBreakdown)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .slice(0, 6)
              .map(([model, stats]) => (
                <div key={model} className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 truncate max-w-[60%]">{model}</span>
                  <span className="text-zinc-300">${(stats.cost / 100).toFixed(2)} ({stats.calls} calls)</span>
                </div>
              ))}
          </div>
        </div>

        {/* Token totals */}
        <div className="flex gap-4 pt-2 border-t border-zinc-800">
          <div className="text-xs font-mono">
            <span className="text-zinc-500">Input: </span>
            <span className="text-zinc-300">{(data.totalInputTokens / 1000).toFixed(1)}K</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-zinc-500">Output: </span>
            <span className="text-zinc-300">{(data.totalOutputTokens / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
