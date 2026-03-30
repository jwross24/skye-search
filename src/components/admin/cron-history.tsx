'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface CronLog {
  execution_date: string
  status: string
  trigger_source: string
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  unemployment_days_used_before: number | null
  unemployment_days_used_after: number | null
}

interface TaskActivity {
  discover: number
  score: number
  failed: number
}

interface CronData {
  unemploymentCron: CronLog[]
  taskActivity: Record<string, TaskActivity>
}

function CellColor({ log, activity }: { log?: CronLog; activity?: TaskActivity }) {
  if (log?.status === 'completed' || (activity && activity.failed === 0 && (activity.discover > 0 || activity.score > 0))) {
    return 'bg-emerald-500/60 hover:bg-emerald-400/80'
  }
  if (log?.status === 'error' || (activity && activity.failed > 0)) {
    return 'bg-rose-500/60 hover:bg-rose-400/80'
  }
  if (log?.status === 'started') {
    return 'bg-amber-500/60 hover:bg-amber-400/80'
  }
  return 'bg-zinc-800 hover:bg-zinc-700'
}

export function CronHistory() {
  const [data, setData] = useState<CronData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/cron-history?range=30d')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  // Lazy initializer runs once — avoids impure Date.now() during render
  const [days] = useState(() => {
    const result: string[] = []
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      result.push(new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    }
    return result
  })

  const cronByDate = useMemo(
    () => data ? new Map(data.unemploymentCron.map(l => [l.execution_date, l])) : new Map(),
    [data],
  )

  if (loading || !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Cron History</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 bg-zinc-800" /></CardContent>
      </Card>
    )
  }

  const selectedLog = selectedDay ? cronByDate.get(selectedDay) : null
  const selectedActivity = selectedDay ? data.taskActivity[selectedDay] : null

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-zinc-300">Cron History (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Heatmap grid */}
        <div className="space-y-2">
          {/* Unemployment cron row */}
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-1">Unemployment checkpoint</p>
            <div className="flex gap-1">
              {days.map(day => {
                const log = cronByDate.get(day)
                return (
                  <button
                    key={`ue-${day}`}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={`flex-1 h-6 rounded-sm transition-colors cursor-pointer ${CellColor({ log })} ${selectedDay === day ? 'ring-1 ring-zinc-400' : ''}`}
                    title={`${day}: ${log?.status ?? 'no data'}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Discovery/scoring row */}
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-1">Discovery + Scoring</p>
            <div className="flex gap-1">
              {days.map(day => {
                const activity = data.taskActivity[day]
                return (
                  <button
                    key={`ds-${day}`}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={`flex-1 h-6 rounded-sm transition-colors cursor-pointer ${CellColor({ activity })} ${selectedDay === day ? 'ring-1 ring-zinc-400' : ''}`}
                    title={`${day}: ${activity ? `${activity.discover} discover, ${activity.score} score` : 'no data'}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Date labels */}
          <div className="flex justify-between text-xs text-zinc-600 font-mono">
            <span>{days[0]?.slice(5)}</span>
            <span>{days[14]?.slice(5)}</span>
            <span>{days[29]?.slice(5)}</span>
          </div>
        </div>

        {/* Detail panel */}
        {selectedDay && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <p className="text-sm font-mono font-medium text-zinc-200 mb-2">{selectedDay}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {selectedLog && (
                <>
                  <div className="text-zinc-500">Unemployment cron</div>
                  <div className="text-zinc-300">{selectedLog.status}</div>
                  <div className="text-zinc-500">Trigger</div>
                  <div className="text-zinc-300">{selectedLog.trigger_source}</div>
                  {selectedLog.unemployment_days_used_after != null && (
                    <>
                      <div className="text-zinc-500">Days used</div>
                      <div className="text-zinc-300">
                        {selectedLog.unemployment_days_used_before} → {selectedLog.unemployment_days_used_after}
                      </div>
                    </>
                  )}
                  {selectedLog.error_message && (
                    <>
                      <div className="text-zinc-500">Error</div>
                      <div className="text-rose-400">{selectedLog.error_message}</div>
                    </>
                  )}
                </>
              )}
              {selectedActivity && (
                <>
                  <div className="text-zinc-500">Discovery tasks</div>
                  <div className="text-zinc-300">{selectedActivity.discover}</div>
                  <div className="text-zinc-500">Score tasks</div>
                  <div className="text-zinc-300">{selectedActivity.score}</div>
                  {selectedActivity.failed > 0 && (
                    <>
                      <div className="text-zinc-500">Failed</div>
                      <div className="text-rose-400">{selectedActivity.failed}</div>
                    </>
                  )}
                </>
              )}
              {!selectedLog && !selectedActivity && (
                <div className="col-span-2 text-zinc-600">No activity this day</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
