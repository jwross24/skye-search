import { NextResponse } from 'next/server'
import { authenticateAdmin } from '../auth'

/**
 * GET /api/admin/scoring-stats
 *
 * Score distribution, employer type breakdown, visa path breakdown.
 */
export async function GET(req: Request) {
  const auth = await authenticateAdmin(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId: _userId, supabase } = auth
  const user = { id: _userId }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, match_score, urgency_score, employer_type, visa_path, source_type, title, company')
    .eq('user_id', user.id)
    .limit(5000)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({
      total: 0,
      scoreDistribution: [],
      avgMatchScore: null,
      employerBreakdown: {},
      visaPathBreakdown: {},
      sourceBreakdown: {},
      topMatches: [],
    })
  }

  // Score distribution (10 bins: 0.0-0.1, 0.1-0.2, etc.)
  const bins = Array.from({ length: 10 }, () => 0)
  let scoreSum = 0
  let scoreCount = 0
  for (const job of jobs) {
    if (job.match_score != null) {
      const bin = Math.min(Math.floor(job.match_score * 10), 9)
      bins[bin]++
      scoreSum += job.match_score
      scoreCount++
    }
  }

  const scoreDistribution = bins.map((count, i) => ({
    range: `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`,
    count,
  }))

  // Breakdowns
  const employerBreakdown: Record<string, number> = {}
  const visaPathBreakdown: Record<string, number> = {}
  const sourceBreakdown: Record<string, number> = {}

  for (const job of jobs) {
    const et = job.employer_type ?? 'unknown'
    employerBreakdown[et] = (employerBreakdown[et] ?? 0) + 1
    const vp = job.visa_path ?? 'unknown'
    visaPathBreakdown[vp] = (visaPathBreakdown[vp] ?? 0) + 1
    const st = job.source_type ?? 'unknown'
    sourceBreakdown[st] = (sourceBreakdown[st] ?? 0) + 1
  }

  // Top matches (highest match_score, not yet in tracker)
  const topMatches = jobs
    .filter(j => j.match_score != null)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 10)
    .map(j => ({ id: j.id, title: j.title, company: j.company, matchScore: j.match_score, visaPath: j.visa_path, employerType: j.employer_type }))

  return NextResponse.json({
    total: jobs.length,
    scoreDistribution,
    avgMatchScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : null,
    employerBreakdown,
    visaPathBreakdown,
    sourceBreakdown,
    topMatches,
  })
}
