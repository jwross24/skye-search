import { createClient } from '@supabase/supabase-js'
import { shouldSuppressForBreakMode } from './email-alerts'
import type { DailyPickJob } from './email-templates/templates/daily-picks'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ScoringStatus = 'complete' | 'stale' | 'failed'

export interface DailyPicksData {
  picks: DailyPickJob[]
  daysUsed: number
  daysRemaining: number
  capExemptCount: number
  bridgeCount: number
  scoringStatus: ScoringStatus
}

export interface DailyPicksResult {
  sent: boolean
  reason?: string
  data?: DailyPicksData
}

const MAX_PICKS = 3

// ─── Supabase Client ────────────────────────────────────────────────────────

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Scoring Completion Gate ────────────────────────────────────────────────

/**
 * Check whether today's scoring batch has completed.
 *
 * Returns:
 *   'complete' — scoring task finished within the last 24h
 *   'stale'    — scoring task still running or pending
 *   'failed'   — scoring task failed or no task found
 */
export async function checkScoringStatus(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<ScoringStatus> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: tasks } = await supabase
    .from('task_queue')
    .select('status, created_at')
    .eq('user_id', userId)
    .eq('task_type', 'ai_score_batch')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!tasks || tasks.length === 0) return 'failed'

  const latest = tasks[0]
  if (latest.status === 'completed') return 'complete'
  if (latest.status === 'failed') return 'failed'
  // pending or processing
  return 'stale'
}

// ─── Pick Selection ─────────────────────────────────────────────────────────

/**
 * Select top picks for the daily email.
 *
 * Uses match_score from Claude AI scoring (not the client-side urgency score)
 * because the email runs server-side without user session context.
 *
 * Excludes jobs the user has already voted on or applied to.
 */
export async function selectTopPicks(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<DailyPickJob[]> {
  // Get exclusion sets in parallel
  const [votesResult, appsResult, jobsResult] = await Promise.all([
    supabase.from('votes').select('job_id').eq('user_id', userId),
    supabase.from('applications').select('job_id').eq('user_id', userId),
    supabase
      .from('jobs')
      .select('id, title, company, visa_path, location, url, match_score, why_fits')
      .eq('user_id', userId)
      .not('match_score', 'is', null)
      .order('match_score', { ascending: false })
      .limit(50), // Over-fetch then filter
  ])

  const excludedIds = new Set([
    ...(votesResult.data ?? []).map((v) => v.job_id),
    ...(appsResult.data ?? []).map((a) => a.job_id).filter(Boolean),
  ])

  const picks: DailyPickJob[] = (jobsResult.data ?? [])
    .filter((j) => !excludedIds.has(j.id))
    .slice(0, MAX_PICKS)
    .map((j) => ({
      title: j.title ?? '',
      company: j.company ?? '',
      visaPath: j.visa_path ?? 'unknown',
      location: j.location ?? undefined,
      score: j.match_score ? Math.round(j.match_score * 100) : undefined,
      url: j.url ?? undefined,
      whyFits: j.why_fits ?? undefined,
    }))

  return picks
}

// ─── Immigration Clock ──────────────────────────────────────────────────────

export async function getClockState(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<{ daysUsed: number; daysRemaining: number }> {
  const [immResult, clockResult] = await Promise.all([
    supabase
      .from('immigration_status')
      .select('initial_days_used')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('immigration_clock')
      .select('days_remaining')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const initialUsed = immResult.data?.initial_days_used ?? 0
  const daysRemaining = clockResult.data?.days_remaining ?? (150 - initialUsed)
  const daysUsed = 150 - daysRemaining

  return { daysUsed, daysRemaining }
}

// ─── Break Mode Check ───────────────────────────────────────────────────────

export async function isBreakModeSuppressed(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  daysRemaining: number,
): Promise<boolean> {
  const { data: userRow } = await supabase
    .from('users')
    .select('break_mode_until')
    .eq('id', userId)
    .single()

  // Treat daily_picks like unemployment_digest for break mode purposes:
  // suppress during break UNLESS <15 days remaining
  return shouldSuppressForBreakMode(
    userRow?.break_mode_until ?? null,
    'unemployment_digest',
    daysRemaining,
  )
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Gather all data needed for the daily picks email.
 *
 * Returns { sent: false, reason } if the email should be skipped.
 * Returns { sent: true, data } if the email should be sent.
 */
export async function prepareDailyPicks(
  userId: string,
): Promise<DailyPicksResult> {
  const supabase = createServiceClient()

  // 1. Clock state
  const { daysUsed, daysRemaining } = await getClockState(supabase, userId)

  // 2. Break mode
  if (await isBreakModeSuppressed(supabase, userId, daysRemaining)) {
    return { sent: false, reason: 'break_mode' }
  }

  // 3. Scoring gate
  const scoringStatus = await checkScoringStatus(supabase, userId)

  // 4. Select picks
  const picks = await selectTopPicks(supabase, userId)

  // Spec: skip email entirely when no picks available
  if (picks.length === 0) {
    return { sent: false, reason: 'no_picks' }
  }

  // 5. Classify picks for urgency summary
  const capExemptCount = picks.filter((p) => p.visaPath === 'cap_exempt').length
  const bridgeCount = picks.filter(
    (p) => p.visaPath === 'cap_subject' || p.visaPath === 'opt_compatible',
  ).length

  return {
    sent: true,
    data: {
      picks,
      daysUsed,
      daysRemaining,
      capExemptCount,
      bridgeCount,
      scoringStatus,
    },
  }
}
