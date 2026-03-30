'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ScoringData {
  total: number
  scoreDistribution: Array<{ range: string; count: number }>
  avgMatchScore: number | null
  employerBreakdown: Record<string, number>
  visaPathBreakdown: Record<string, number>
  sourceBreakdown: Record<string, number>
  topMatches: Array<{ id: string; title: string; company: string; matchScore: number; visaPath: string; employerType: string }>
}

const VISA_COLORS: Record<string, string> = {
  cap_exempt: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cap_subject: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  opt_compatible: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  canada: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  unknown: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

const EMPLOYER_LABELS: Record<string, string> = {
  university: 'University',
  nonprofit_research: 'Nonprofit Research',
  cooperative_institute: 'Cooperative Institute',
  government_contractor: 'Gov Contractor',
  government_direct: 'Government Direct',
  private_sector: 'Private Sector',
  unknown: 'Unknown',
}

export function ScoringStats() {
  const [data, setData] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/scoring-stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Scoring Quality</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 bg-zinc-800" /></CardContent>
      </Card>
    )
  }

  if (data.total === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base font-medium text-zinc-300">Scoring Quality</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-zinc-600 font-mono">No scored jobs yet</p></CardContent>
      </Card>
    )
  }

  const maxBin = Math.max(...data.scoreDistribution.map(b => b.count), 1)

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-300">Scoring Quality</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-zinc-400">
              {data.total} jobs scored
            </span>
            {data.avgMatchScore != null && (
              <span className="text-sm font-mono text-zinc-300">
                avg: <span className="text-sky-400">{data.avgMatchScore.toFixed(2)}</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Distribution Histogram */}
        <div>
          <p className="text-xs text-zinc-500 font-mono mb-2">Match score distribution</p>
          <div className="flex items-end gap-1 h-20">
            {data.scoreDistribution.map(bin => {
              const height = Math.max((bin.count / maxBin) * 100, 2)
              const isHighScore = parseFloat(bin.range.split('-')[0]) >= 0.7
              return (
                <div
                  key={bin.range}
                  className={`flex-1 rounded-t transition-colors cursor-default ${isHighScore ? 'bg-emerald-500/60 hover:bg-emerald-400/80' : 'bg-sky-500/40 hover:bg-sky-400/60'}`}
                  style={{ height: `${height}%` }}
                  title={`${bin.range}: ${bin.count} jobs`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-zinc-600 font-mono mt-1">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>

        {/* Breakdowns side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Employer type */}
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-2">By employer type</p>
            <div className="space-y-1">
              {Object.entries(data.employerBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">{EMPLOYER_LABELS[type] ?? type}</span>
                    <span className="text-zinc-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Visa path */}
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-2">By visa path</p>
            <div className="space-y-1.5">
              {Object.entries(data.visaPathBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([path, count]) => (
                  <div key={path} className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs font-mono ${VISA_COLORS[path] ?? VISA_COLORS.unknown}`}>
                      {path.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-zinc-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-2">By source</p>
            <div className="space-y-1">
              {Object.entries(data.sourceBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">{source}</span>
                    <span className="text-zinc-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Top matches */}
        {data.topMatches.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 font-mono mb-2">Top matches</p>
            <div className="space-y-2">
              {data.topMatches.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 truncate">{job.title}</p>
                    <p className="text-xs text-zinc-500 font-mono">{job.company}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge variant="outline" className={`text-xs font-mono ${VISA_COLORS[job.visaPath] ?? VISA_COLORS.unknown}`}>
                      {job.visaPath.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-mono font-semibold text-emerald-400">
                      {(job.matchScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
