import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/health
 *
 * Liveness probe — no auth, no external deps. Proves:
 * 1. Next.js API routes are reachable (not redirected by proxy)
 * 2. The process is alive and can handle requests
 *
 * For deeper checks (DB, cron health, pipeline staleness), use GET /api/health?ready=true
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const checkReady = url.searchParams.get('ready') === 'true'

  // Liveness: always returns 200 if we got here
  if (!checkReady) {
    return NextResponse.json({ status: 'alive', timestamp: new Date().toISOString() })
  }

  // Readiness: check external dependencies + cron health
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  const checks: Record<string, { healthy: boolean; last_run?: string; stale?: boolean; detail?: string }> = {}

  // ─── DB connectivity ────────────────────────────────────────────────────
  try {
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    checks.db = { healthy: !error, detail: error?.message }
  } catch {
    checks.db = { healthy: false, detail: 'connection failed' }
  }

  // ─── Unemployment cron (daily — stale if >26h) ─────────────────────────
  try {
    const { data: lastCron } = await supabase
      .from('cron_execution_log')
      .select('completed_at, status')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastCron?.completed_at) {
      const ageHours = (Date.now() - new Date(lastCron.completed_at).getTime()) / (1000 * 60 * 60)
      checks.unemployment_cron = {
        healthy: ageHours < 26,
        last_run: lastCron.completed_at,
        stale: ageHours >= 26,
        detail: ageHours >= 26 ? `${Math.round(ageHours)}h since last run` : undefined,
      }
    } else {
      checks.unemployment_cron = { healthy: true, detail: 'no runs yet (bootstrap)' }
    }
  } catch {
    checks.unemployment_cron = { healthy: false, detail: 'query failed' }
  }

  // ─── Queue worker (stale if pending tasks >24h old) ────────────────────
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: stalePending } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])
      .lt('created_at', twentyFourHoursAgo)

    const { data: lastCompleted } = await supabase
      .from('task_queue')
      .select('updated_at')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasStale = (stalePending ?? 0) > 0
    checks.queue_worker = {
      healthy: !hasStale,
      last_run: lastCompleted?.updated_at ?? undefined,
      stale: hasStale,
      detail: hasStale ? `${stalePending} tasks pending >24h` : undefined,
    }
  } catch {
    checks.queue_worker = { healthy: false, detail: 'query failed' }
  }

  // ─── Exa discovery pipeline (bi-weekly — stale if >8 days) ─────────────
  try {
    const { data: lastDiscovery } = await supabase
      .from('discovered_jobs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastDiscovery?.created_at) {
      const ageDays = (Date.now() - new Date(lastDiscovery.created_at).getTime()) / (1000 * 60 * 60 * 24)
      checks.exa_pipeline = {
        healthy: ageDays < 8,
        last_run: lastDiscovery.created_at,
        stale: ageDays >= 8,
        detail: ageDays >= 8 ? `${Math.round(ageDays)}d since last discovery` : undefined,
      }
    } else {
      checks.exa_pipeline = { healthy: true, detail: 'no discoveries yet (bootstrap)' }
    }
  } catch {
    checks.exa_pipeline = { healthy: false, detail: 'query failed' }
  }

  // ─── AI scoring pipeline (daily — stale if >26h when unscored jobs exist) ─
  try {
    const { data: lastScored } = await supabase
      .from('task_queue')
      .select('updated_at')
      .eq('task_type', 'ai_score_batch')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { count: unscoredCount } = await supabase
      .from('discovered_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('scored', false)

    if (lastScored?.updated_at) {
      const ageHours = (Date.now() - new Date(lastScored.updated_at).getTime()) / (1000 * 60 * 60)
      const hasBacklog = (unscoredCount ?? 0) > 0 && ageHours >= 26
      checks.scoring_pipeline = {
        healthy: !hasBacklog,
        last_run: lastScored.updated_at,
        stale: hasBacklog,
        detail: hasBacklog ? `${unscoredCount} unscored, ${Math.round(ageHours)}h since last score` : `${unscoredCount ?? 0} unscored`,
      }
    } else {
      checks.scoring_pipeline = { healthy: true, detail: `${unscoredCount ?? 0} unscored (no scoring runs yet)` }
    }
  } catch {
    checks.scoring_pipeline = { healthy: false, detail: 'query failed' }
  }

  const allHealthy = Object.values(checks).every(c => c.healthy)

  return NextResponse.json(
    {
      status: allHealthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 },
  )
}
