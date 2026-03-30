'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Source {
  name: string
  jobs24h: number
  jobs7d: number
  jobs30d: number
  lastFetch: string | null
  errorRate7d: number
}

const SOURCE_LABELS: Record<string, string> = {
  exa: 'Exa (Neural Search)',
  usajobs: 'USAJobs (Federal)',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function DiscoverySources() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/sources')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSources(data.sources) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Discovery Sources</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-20 bg-zinc-800" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-zinc-300">Discovery Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.length === 0 ? (
          <p className="text-sm text-zinc-600 font-mono">No sources active</p>
        ) : (
          sources.map(src => {
            const status = src.errorRate7d > 50 ? 'down' : src.errorRate7d > 10 ? 'degraded' : 'active'
            const statusColor = status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : status === 'degraded' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'

            return (
              <div key={src.name} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {SOURCE_LABELS[src.name] ?? src.name}
                  </span>
                  <Badge variant="outline" className={`text-xs font-mono ${statusColor}`}>
                    {status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-mono font-semibold text-zinc-100">{src.jobs24h}</p>
                    <p className="text-xs text-zinc-500">24h</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-semibold text-zinc-100">{src.jobs7d}</p>
                    <p className="text-xs text-zinc-500">7d</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-semibold text-zinc-100">{src.jobs30d}</p>
                    <p className="text-xs text-zinc-500">30d</p>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs font-mono text-zinc-500">
                  <span>Last fetch: {timeAgo(src.lastFetch)}</span>
                  <span>Error rate: {src.errorRate7d}%</span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
