import { NextResponse } from 'next/server'
import { authenticateAdmin } from '../auth'

/** Minimum match_score to consider a job "high match" for engagement metrics. */
const HIGH_MATCH_THRESHOLD = 0.65

/** Per-source precision metrics keyed by discovery_source_detail. */
export interface SourceMetric {
  discovered: number
  scored: number
  matched: number
  relevant: number
  us_canada: number
  precision: number | null
  us_canada_rate: number | null
}

/**
 * GET /api/admin/pipeline-eval
 *
 * Computes 5 pipeline quality metrics from existing data.
 * Used to measure whether P0 scoring fixes worked.
 */
export async function GET(req: Request) {
  const auth = await authenticateAdmin(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId, supabase } = auth

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ─── 1. Posting Precision ────────────────────────────────────────────
  // discovered_jobs (scored=true) → how many made it to the jobs table?
  const { count: totalDiscovered } = await supabase
    .from('discovered_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)

  const { count: scoredDiscovered } = await supabase
    .from('discovered_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('scored', true)
    .gte('created_at', thirtyDaysAgo)

  // Jobs with match_score > 0 are real postings that passed filtering
  const { count: realJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('match_score', 0)
    .gte('created_at', thirtyDaysAgo)

  const postingPrecision = scoredDiscovered && scoredDiscovered > 0
    ? (realJobs ?? 0) / scoredDiscovered
    : null

  // ─── 2. US/Canada Rate ───────────────────────────────────────────────
  // Also fetch url + match_score for per-source metrics (no second query needed).
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('location, visa_path, company, title, url, match_score')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
    .limit(5000)

  const jobs = allJobs ?? []
  const jobsWithLocation = jobs.filter((j) => j.location)
  const usCanadaJobs = jobsWithLocation.filter((j) => isUSOrCanada(j.location!))
  const usCanadaRate = jobsWithLocation.length > 0
    ? usCanadaJobs.length / jobsWithLocation.length
    : null

  // ─── 3. Visa Path Known Rate ─────────────────────────────────────────
  const visaKnown = jobs.filter((j) => j.visa_path && j.visa_path !== 'unknown')
  const visaKnownRate = jobs.length > 0
    ? visaKnown.length / jobs.length
    : null

  // ─── 4. Interested Rate (high match only) ────────────────────────────
  const { count: applicationCount } = await supabase
    .from('applications')
    .select('*, jobs!inner(match_score)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('jobs.match_score', HIGH_MATCH_THRESHOLD)

  const { count: voteCount } = await supabase
    .from('votes')
    .select('*, jobs!inner(match_score)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('decision', 'not_for_me')
    .gt('jobs.match_score', HIGH_MATCH_THRESHOLD)

  const totalActions = (applicationCount ?? 0) + (voteCount ?? 0)
  const interestedRate = totalActions > 0
    ? (applicationCount ?? 0) / totalActions
    : null

  // ─── 5. Duplicate Rate ───────────────────────────────────────────────
  const companyTitlePairs = new Map<string, number>()
  for (const job of jobs) {
    const key = `${(job.company ?? '').toLowerCase().trim()}|${(job.title ?? '').toLowerCase().trim()}`
    companyTitlePairs.set(key, (companyTitlePairs.get(key) ?? 0) + 1)
  }
  const duplicateCount = Array.from(companyTitlePairs.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0)
  const duplicateRate = jobs.length > 0
    ? duplicateCount / jobs.length
    : null

  // ─── Per-source breakdown + per-query precision (single query) ──────────
  // One query fetches all fields needed for both sourceBreakdown and sourceMetrics.
  // The earlier separate sourceDetails query is eliminated to avoid a redundant round-trip.
  const { data: discoveredWithDetail } = await supabase
    .from('discovered_jobs')
    .select('canonical_url, url, scored, discovery_source_detail')
    .eq('user_id', userId)
    .not('discovery_source_detail', 'is', null)
    .gte('created_at', thirtyDaysAgo)
    .limit(5000)

  // sourceBreakdown: prefix (e.g. "query", "seed", "rss") → count
  const sourceBreakdown: Record<string, number> = {}
  for (const row of discoveredWithDetail ?? []) {
    const detail = row.discovery_source_detail ?? 'unknown'
    const prefix = detail.split(':')[0] ?? 'unknown'
    sourceBreakdown[prefix] = (sourceBreakdown[prefix] ?? 0) + 1
  }

  // Build URL → job lookup from already-fetched allJobs (no second query).
  const jobsByUrl = new Map<string, { match_score: number | null; location: string | null }>()
  for (const j of jobs) {
    if (j.url) {
      jobsByUrl.set(j.url, { match_score: j.match_score ?? null, location: j.location ?? null })
    }
  }

  const sourceMetrics: Record<string, SourceMetric> = {}
  for (const row of discoveredWithDetail ?? []) {
    const detail = row.discovery_source_detail as string
    if (!sourceMetrics[detail]) {
      sourceMetrics[detail] = { discovered: 0, scored: 0, matched: 0, relevant: 0, us_canada: 0, precision: null, us_canada_rate: null }
    }
    const m = sourceMetrics[detail]
    m.discovered++
    if (row.scored) m.scored++

    // Match: look up canonical_url first, then fall back to url
    const matchedJob = (row.canonical_url && jobsByUrl.get(row.canonical_url))
      || (row.url && jobsByUrl.get(row.url))
      || null
    if (matchedJob) {
      m.matched++
      if ((matchedJob.match_score ?? 0) > 0) {
        m.relevant++
        if (matchedJob.location && isUSOrCanada(matchedJob.location)) {
          m.us_canada++
        }
      }
    }
  }

  // Compute rates now that all rows are aggregated
  for (const m of Object.values(sourceMetrics)) {
    m.precision = m.scored > 0 ? m.relevant / m.scored : null
    m.us_canada_rate = m.relevant > 0 ? m.us_canada / m.relevant : null
  }

  // ─── Build response ──────────────────────────────────────────────────
  return NextResponse.json({
    period: '30d',
    computed_at: new Date().toISOString(),
    metrics: {
      posting_precision: {
        value: postingPrecision,
        target: 0.95,
        met: postingPrecision !== null && postingPrecision >= 0.95,
        detail: { total_discovered: totalDiscovered ?? 0, scored: scoredDiscovered ?? 0, real_jobs: realJobs ?? 0 },
      },
      us_canada_rate: {
        value: usCanadaRate,
        target: 0.95,
        met: usCanadaRate !== null && usCanadaRate >= 0.95,
        detail: { total_with_location: jobsWithLocation.length, us_canada: usCanadaJobs.length },
      },
      visa_known_rate: {
        value: visaKnownRate,
        target: 0.80,
        met: visaKnownRate !== null && visaKnownRate >= 0.80,
        detail: { total_jobs: jobs.length, visa_known: visaKnown.length },
      },
      interested_rate: {
        value: interestedRate,
        target: 0.30,
        met: interestedRate !== null && interestedRate >= 0.30,
        detail: { applications: applicationCount ?? 0, votes: voteCount ?? 0 },
      },
      duplicate_rate: {
        value: duplicateRate,
        target: 0.05,
        met: duplicateRate !== null && duplicateRate <= 0.05,
        detail: { total_jobs: jobs.length, duplicates: duplicateCount },
      },
    },
    source_breakdown: sourceBreakdown,
    source_metrics: sourceMetrics,
  })
}

function isUSOrCanada(location: string): boolean {
  const loc = location.toLowerCase()

  // US state abbreviations: require a comma before the abbreviation to avoid
  // false positives where state letters appear inside foreign country names
  // (e.g. "australia" contains "ia" = Iowa, "india" contains "ia" = Iowa).
  const usPatterns = [
    /,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b/,
    /\bunited states\b/,
    /\busa?\b/,
    /\bremote.*us\b|\bus.*remote\b/,
  ]

  const canadaPatterns = [
    /\bcanada\b/,
    /\b(on|bc|ab|qc|ns|nb|mb|sk|nl|pe|nt|yt|nu)\b.*canada/i,
    /\b(toronto|vancouver|montreal|ottawa|calgary|edmonton)\b/,
  ]

  return usPatterns.some((p) => p.test(loc)) || canadaPatterns.some((p) => p.test(loc))
}
