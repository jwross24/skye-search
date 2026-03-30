'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface Task {
  id: string
  task_type: string
  status: string
  payload_json: Record<string, unknown> | null
  result_json: Record<string, unknown> | null
  error_log: string | null
  retry_count: number
  max_retries: number
  dead_lettered_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  processing: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed_retry: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  failed_validation: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

const RANGES = [
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
]

export function TaskQueueMonitor() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('24h')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [expandedError, setExpandedError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams({ range })
    if (statusFilter) params.set('status', statusFilter)
    try {
      const res = await fetch(`/api/admin/task-queue?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks)
        setCounts(data.counts)
      }
    } finally {
      setLoading(false)
    }
  }, [range, statusFilter])

  useEffect(() => {
    setLoading(true)
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  async function retryTask(taskId: string) {
    setRetrying(taskId)
    try {
      const res = await fetch('/api/admin/retry-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (res.ok) fetchTasks()
    } finally {
      setRetrying(null)
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-medium text-zinc-300">Task Queue</CardTitle>
          <div className="flex items-center gap-2">
            {/* Status filter badges */}
            <button
              onClick={() => setStatusFilter(null)}
              className={`text-xs font-mono px-2 py-0.5 rounded border ${!statusFilter ? 'border-zinc-500 text-zinc-200' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
            >
              all ({Object.values(counts).reduce((a, b) => a + b, 0)})
            </button>
            {Object.entries(counts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                className={`text-xs font-mono px-2 py-0.5 rounded border ${statusFilter === status ? 'border-zinc-500 text-zinc-200' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
              >
                {status.replace('failed_', '')} ({count})
              </button>
            ))}
            {/* Range selector */}
            <div className="flex border border-zinc-800 rounded overflow-hidden ml-2">
              {RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`text-xs font-mono px-2 py-1 ${range === r.value ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-zinc-800" />)}
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-zinc-600 font-mono py-4 text-center">No tasks in this range</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-mono text-xs">type</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-xs">status</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-xs">payload</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-xs">retries</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-xs">created</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-xs">actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow key={task.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                    <TableCell className="font-mono text-xs text-zinc-300">{task.task_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-mono ${STATUS_COLORS[task.status] ?? 'text-zinc-400'}`}>
                        {task.status.replace('failed_', '')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500 max-w-[200px] truncate">
                      {task.payload_json ? JSON.stringify(task.payload_json).slice(0, 60) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {task.retry_count}/{task.max_retries}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {new Date(task.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(task.status === 'failed_validation' || task.dead_lettered_at) && (
                          <button
                            onClick={() => retryTask(task.id)}
                            disabled={retrying === task.id}
                            className="text-xs font-mono text-sky-400 hover:text-sky-300 disabled:text-zinc-600"
                          >
                            {retrying === task.id ? '...' : 'retry'}
                          </button>
                        )}
                        {task.error_log && (
                          <button
                            onClick={() => setExpandedError(expandedError === task.id ? null : task.id)}
                            className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
                          >
                            {expandedError === task.id ? 'hide' : 'error'}
                          </button>
                        )}
                      </div>
                      {expandedError === task.id && task.error_log && (
                        <pre className="text-xs font-mono text-rose-400/80 mt-1 whitespace-pre-wrap max-w-xs">
                          {task.error_log}
                        </pre>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
