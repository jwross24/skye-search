'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricValue {
  value: number | null
  target: number
  met: boolean
  detail: Record<string, number>
}

/** Mirrors SourceMetric from route.ts — defined locally to avoid fragile cross-dir API imports. */
interface SourceMetric {
  discovered: number
  scored: number
  matched: number
  relevant: number
  us_canada: number
  precision: number | null
  us_canada_rate: number | null
}

interface EvalData {
  period: string
  computed_at: string
  metrics: {
    validity_rate: MetricValue
    relevance_rate: MetricValue
    overall_yield: MetricValue
    us_canada_rate: MetricValue
    visa_known_rate: MetricValue
    interested_rate: MetricValue
    duplicate_rate: MetricValue
  }
  source_breakdown: Record<string, number>
  source_metrics: Record<string, SourceMetric>
}

const METRIC_LABELS: Record<string, { label: string; description: string; invertTarget?: boolean }> = {
  validity_rate: { label: 'Validity Rate', description: 'Real postings / scored (excluding unknowns)' },
  relevance_rate: { label: 'Relevance Rate', description: 'Matched jobs / valid postings — measures query specificity' },
  overall_yield: { label: 'Overall Yield', description: 'Matched jobs / scored — legacy "Posting Precision"' },
  us_canada_rate: { label: 'US/Canada Rate', description: 'Jobs in US or Canada' },
  visa_known_rate: { label: 'Visa Path Known', description: 'Jobs with identified visa path' },
  interested_rate: { label: 'Interested Rate', description: 'Applications / (applications + dismissals) — high match jobs' },
  duplicate_rate: { label: 'Duplicate Rate', description: 'Company+title duplicates', invertTarget: true },
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function precisionColor(precision: number | null): string {
  if (precision === null) return 'text-zinc-500'
  if (precision < 0.3) return 'text-red-400'
  if (precision < 0.6) return 'text-amber-400'
  return 'text-emerald-400'
}

export function PipelineEval() {
  const [data, setData] = useState<EvalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pipeline-eval')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (d) setData(d) })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Pipeline Eval</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 bg-zinc-800" /></CardContent>
      </Card>
    )
  }

  if (fetchFailed || !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Pipeline Eval</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">Couldn&apos;t load eval data. Check admin access and try again.</p>
        </CardContent>
      </Card>
    )
  }

  const metrics = Object.entries(data.metrics) as [keyof typeof METRIC_LABELS, MetricValue][]
  const metCount = metrics.filter(([, m]) => m.met).length

  const sourceMetricEntries = Object.entries(data.source_metrics ?? {})
  const sortedSourceMetrics = [...sourceMetricEntries].sort(([, a], [, b]) => {
    // nulls last
    if (a.precision === null && b.precision === null) return 0
    if (a.precision === null) return 1
    if (b.precision === null) return -1
    return a.precision - b.precision
  })

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

        {/* Source Performance panel — omitted when empty, open by default so worst performers are visible on landing */}
        {sortedSourceMetrics.length > 0 && (
          <div className="pt-2 mt-2 border-t border-zinc-800">
            <details open className="group">
              <summary className="text-xs text-zinc-500 cursor-pointer select-none hover:text-zinc-400 list-none flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:ring-offset-0">
                <ChevronRight
                  aria-hidden="true"
                  className="h-3 w-3 transition-transform duration-150 [details[open]_&]:rotate-90"
                />
                <span>Source Performance</span>
                <span className="text-zinc-600 font-mono">· {sortedSourceMetrics.length} {sortedSourceMetrics.length === 1 ? 'query' : 'queries'}</span>
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs font-mono" aria-label="Per-source precision metrics">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th scope="col" className="text-left pb-1.5 pr-3 font-normal">Source</th>
                      <th scope="col" className="text-right pb-1.5 pr-3 font-normal">Discovered</th>
                      <th scope="col" className="text-right pb-1.5 pr-3 font-normal">Scored</th>
                      <th scope="col" className="text-right pb-1.5 pr-3 font-normal">Precision</th>
                      <th scope="col" className="text-right pb-1.5 font-normal">US/CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSourceMetrics.map(([detail, m]) => (
                      <tr
                        key={detail}
                        className="border-b border-zinc-800/40 last:border-0 transition-colors hover:bg-zinc-800/40"
                      >
                        <td className="py-1.5 pr-3 text-zinc-400">
                          <span
                            className="inline-block max-w-[240px] truncate align-bottom"
                            title={detail}
                          >
                            {detail}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-zinc-500 tabular-nums">{m.discovered}</td>
                        <td className="py-1.5 pr-3 text-right text-zinc-500 tabular-nums">{m.scored}</td>
                        <td className={`py-1.5 pr-3 text-right tabular-nums ${precisionColor(m.precision)}`}>
                          {formatPercent(m.precision)}
                        </td>
                        <td className="py-1.5 text-right text-zinc-500 tabular-nums">
                          {formatPercent(m.us_canada_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
