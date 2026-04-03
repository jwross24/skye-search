'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricValue {
  value: number | null
  target: number
  met: boolean
  detail: Record<string, number>
}

interface EvalData {
  period: string
  computed_at: string
  metrics: {
    posting_precision: MetricValue
    us_canada_rate: MetricValue
    visa_known_rate: MetricValue
    interested_rate: MetricValue
    duplicate_rate: MetricValue
  }
  source_breakdown: Record<string, number>
}

const METRIC_LABELS: Record<string, { label: string; description: string; invertTarget?: boolean }> = {
  posting_precision: { label: 'Posting Precision', description: 'Real jobs / scored discovered' },
  us_canada_rate: { label: 'US/Canada Rate', description: 'Jobs in US or Canada' },
  visa_known_rate: { label: 'Visa Path Known', description: 'Jobs with identified visa path' },
  interested_rate: { label: 'Interested Rate', description: 'Applications / (applications + dismissals) — high match jobs' },
  duplicate_rate: { label: 'Duplicate Rate', description: 'Company+title duplicates', invertTarget: true },
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function PipelineEval() {
  const [data, setData] = useState<EvalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pipeline-eval')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Pipeline Eval</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 bg-zinc-800" /></CardContent>
      </Card>
    )
  }

  const metrics = Object.entries(data.metrics) as [keyof typeof METRIC_LABELS, MetricValue][]
  const metCount = metrics.filter(([, m]) => m.met).length

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-zinc-300">Pipeline Eval</CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={metCount === metrics.length
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : metCount >= 3
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }
          >
            {metCount}/{metrics.length} targets met
          </Badge>
          <span className="text-xs text-zinc-600 font-mono">{data.period}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map(([key, metric]) => {
          const info = METRIC_LABELS[key]
          return (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">{info.label}</p>
                <p className="text-xs text-zinc-600 font-mono">{info.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-mono tabular-nums ${
                  metric.value === null
                    ? 'text-zinc-600'
                    : metric.met
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                }`}>
                  {formatPercent(metric.value)}
                </span>
                <span className="text-xs text-zinc-600 font-mono">
                  {info.invertTarget ? '≤' : '≥'}{(metric.target * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )
        })}

        {/* Source breakdown */}
        {Object.keys(data.source_breakdown).length > 0 && (
          <div className="pt-2 mt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">Discovery sources (30d)</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.source_breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <Badge
                    key={source}
                    variant="outline"
                    className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-xs font-mono"
                  >
                    {source}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
