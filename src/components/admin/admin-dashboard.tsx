'use client'

import { useEffect, useState, useCallback } from 'react'
import { PipelineHealth } from './pipeline-health'
import { TaskQueueMonitor } from './task-queue-monitor'
import { DiscoverySources } from './discovery-sources'
import { CostTracker } from './cost-tracker'
import { CronHistory } from './cron-history'
import { ScoringStats } from './scoring-stats'

interface PipelineHealthData {
  discovery: { status: string; lastRun: string | null; completed: number; failed: number; sources: string[] }
  scoring: { status: string; lastRun: string | null; scored: number; failed: number; total: number }
  queue: { status: string; pending: number; deadLettered: number; oldestPendingMinutes: number | null }
  unemployment: { status: string; lastCheckpoint: { checkpoint_date: string; status_snapshot: string; unemployment_days_used_cumulative: number } | null; lastCronRun: { execution_date: string; status: string; error_message: string | null } | null }
  alerts: { status: string; recentCount: number; lastSent: string | null }
}

export function AdminDashboard() {
  const [health, setHealth] = useState<PipelineHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefreshLabel, setLastRefreshLabel] = useState('')

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pipeline-health')
      if (res.ok) {
        setHealth(await res.json())
        setLastRefreshLabel(new Date().toLocaleTimeString())
      }
    } catch {
      // silently retry on next interval
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pipeline Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1 font-mono">
              Last refresh: {lastRefreshLabel || '—'}
              {' · '}
              <button onClick={fetchHealth} className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline">
                refresh now
              </button>
            </p>
          </div>
          <div className="text-xs text-zinc-600 font-mono">auto-refresh: 30s</div>
        </div>

        {/* Section 1: Pipeline Health Cards */}
        <PipelineHealth data={health} loading={loading} />

        {/* Section 2: Task Queue Monitor */}
        <TaskQueueMonitor />

        {/* Section 3 & 4: Sources + Costs side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DiscoverySources />
          <CostTracker />
        </div>

        {/* Section 5: Cron History */}
        <CronHistory />

        {/* Section 6: Scoring Quality */}
        <ScoringStats />
      </div>
    </div>
  )
}
