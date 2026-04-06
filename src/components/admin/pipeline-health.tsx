'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface HealthCardProps {
  title: string
  status: string
  metric: string
  detail: string
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'green' ? 'bg-emerald-400' : status === 'yellow' ? 'bg-amber-400' : 'bg-rose-400'
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 ${status === 'red' ? 'animate-ping' : ''}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

function HealthCard({ title, status, metric, detail }: HealthCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">{metric}</p>
        <p className="text-xs text-zinc-500 mt-1 font-mono">{detail}</p>
      </CardContent>
    </Card>
  )
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface PipelineHealthProps {
  data: {
    discovery: { status: string; lastRun: string | null; completed: number; failed: number }
    scoring: { status: string; lastRun: string | null; scored: number; failed: number; total: number }
    queue: { status: string; pending: number; deadLettered: number; oldestPendingMinutes: number | null }
    unemployment: { status: string; lastCheckpoint: { checkpoint_date: string; unemployment_days_used_cumulative: number } | null; lastCronRun: { execution_date: string; status: string } | null }
    alerts: { status: string; recentCount: number; lastSent: string | null }
    linkValidation?: { status: string; active: number; unvalidated: number; deadLink: number; closed: number; timeout: number; lastRun: string | null }
  } | null
  loading: boolean
}

export function PipelineHealth({ data, loading }: PipelineHealthProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24 bg-zinc-800" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16 bg-zinc-800" /><Skeleton className="h-3 w-32 mt-2 bg-zinc-800" /></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <HealthCard
        title="Discovery"
        status={data.discovery.status}
        metric={`${data.discovery.completed}/${data.discovery.completed + data.discovery.failed}`}
        detail={`Last run ${timeAgo(data.discovery.lastRun)}`}
      />
      <HealthCard
        title="Scoring"
        status={data.scoring.status}
        metric={`${data.scoring.scored}/${data.scoring.total}`}
        detail={data.scoring.failed > 0 ? `${data.scoring.failed} failed` : `Last run ${timeAgo(data.scoring.lastRun)}`}
      />
      <HealthCard
        title="Queue"
        status={data.queue.status}
        metric={`${data.queue.pending} pending`}
        detail={data.queue.deadLettered > 0 ? `${data.queue.deadLettered} dead-lettered` : data.queue.oldestPendingMinutes ? `oldest: ${data.queue.oldestPendingMinutes}m` : 'all clear'}
      />
      <HealthCard
        title="Unemployment Cron"
        status={data.unemployment.status}
        metric={data.unemployment.lastCheckpoint ? `${data.unemployment.lastCheckpoint.unemployment_days_used_cumulative} days` : 'no data'}
        detail={data.unemployment.lastCronRun ? `Last: ${data.unemployment.lastCronRun.execution_date}` : 'never run'}
      />
      <HealthCard
        title="Alerts"
        status={data.alerts.status}
        metric={`${data.alerts.recentCount} sent`}
        detail={`Last ${timeAgo(data.alerts.lastSent)}`}
      />
      {data.linkValidation && (
        <HealthCard
          title="Link Freshness"
          status={data.linkValidation.status}
          metric={`${data.linkValidation.active} active · ${data.linkValidation.deadLink + data.linkValidation.closed} stale`}
          detail={data.linkValidation.lastRun ? `Last run ${timeAgo(data.linkValidation.lastRun)} · ${data.linkValidation.unvalidated} unchecked` : `${data.linkValidation.unvalidated} unchecked · never run`}
        />
      )}
    </div>
  )
}
