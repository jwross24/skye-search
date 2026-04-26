import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * In-process health checks. Used by both /api/health (HTTP probe) and
 * /api/cron/healthcheck (daily monitoring cron). Calling this directly
 * — instead of going over HTTP — avoids the Vercel Deployment Protection
 * gate that blocks deployment-specific URLs from being fetched without auth.
 */

export interface HealthCheck {
  healthy: boolean
  last_run?: string
  stale?: boolean
  detail?: string
}

export interface HealthReport {
  status: 'alive' | 'ready' | 'degraded'
  checks?: Record<string, HealthCheck>
  timestamp: string
}

/**
 * Liveness check (default): always returns alive if the function ran.
 * Readiness check (opts.ready=true): runs the 5 dependency checks against Supabase.
 *
 * Pass a stub `client` for tests so you don't have to mock the module-level
 * `createClient` import.
 */
export async function runHealthChecks(opts?: {
  ready?: boolean
  client?: SupabaseClient
}): Promise<HealthReport> {
  const timestamp = new Date().toISOString()
  if (!opts?.ready) {
    return { status: 'alive', timestamp }
  }

  const supabase =
    opts.client ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

  const checks: Record<string, HealthCheck> = {
    db: await checkDb(supabase),
    unemployment_cron: await checkUnemploymentCron(supabase),
    queue_worker: await checkQueueWorker(supabase),
    exa_pipeline: await checkExaPipeline(supabase),
    scoring_pipeline: await checkScoringPipeline(supabase),
  }

  const allHealthy = Object.values(checks).every((c) => c.healthy)
  return {
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }
}

// ─── DB connectivity ──────────────────────────────────────────────────────
async function checkDb(supabase: SupabaseClient): Promise<HealthCheck> {
  try {
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    return { healthy: !error, detail: error?.message }
  } catch {
    return { healthy: false, detail: 'connection failed' }
  }
}

// ─── Unemployment cron (daily — checks actual checkpoint data) ──────────
// The cron creates yesterday's checkpoint. On Hobby plan it has a 1-hour flex
// window. An idempotent re-run (skip_idempotent) doesn't write to cron_execution_log,
// so we check daily_checkpoint directly — the source of truth for whether the
// system is tracking unemployment days correctly.
async function checkUnemploymentCron(supabase: SupabaseClient): Promise<HealthCheck> {
  try {
    const { data: lastCheckpoint } = await supabase
      .from('daily_checkpoint')
      .select('checkpoint_date, created_at')
      .order('checkpoint_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastCheckpoint?.created_at) {
      const ageHours = (Date.now() - new Date(lastCheckpoint.created_at).getTime()) / (1000 * 60 * 60)
      // 50h threshold: cron targets yesterday, so a checkpoint from 2 days ago is stale.
      // Normal gap is ~24h (yesterday's checkpoint created today). 50h accommodates
      // Hobby plan flex window + timezone edge cases without false alarms.
      return {
        healthy: ageHours < 50,
        last_run: lastCheckpoint.created_at,
        stale: ageHours >= 50,
        detail:
          ageHours >= 50
            ? `${Math.round(ageHours)}h since last checkpoint (${lastCheckpoint.checkpoint_date})`
            : `latest: ${lastCheckpoint.checkpoint_date}`,
      }
    }
    return { healthy: true, detail: 'no checkpoints yet (bootstrap)' }
  } catch {
    return { healthy: false, detail: 'query failed' }
  }
}

// ─── Queue worker (stale if pending tasks >24h old) ────────────────────
async function checkQueueWorker(supabase: SupabaseClient): Promise<HealthCheck> {
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
    return {
      healthy: !hasStale,
      last_run: lastCompleted?.updated_at ?? undefined,
      stale: hasStale,
      detail: hasStale ? `${stalePending} tasks pending >24h` : undefined,
    }
  } catch {
    return { healthy: false, detail: 'query failed' }
  }
}

// ─── Exa discovery pipeline (bi-weekly — stale if >8 days) ─────────────
async function checkExaPipeline(supabase: SupabaseClient): Promise<HealthCheck> {
  try {
    const { data: lastDiscovery } = await supabase
      .from('discovered_jobs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastDiscovery?.created_at) {
      const ageDays =
        (Date.now() - new Date(lastDiscovery.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return {
        healthy: ageDays < 8,
        last_run: lastDiscovery.created_at,
        stale: ageDays >= 8,
        detail: ageDays >= 8 ? `${Math.round(ageDays)}d since last discovery` : undefined,
      }
    }
    return { healthy: true, detail: 'no discoveries yet (bootstrap)' }
  } catch {
    return { healthy: false, detail: 'query failed' }
  }
}

// ─── AI scoring pipeline (daily — stale if >26h when unscored jobs exist) ─
async function checkScoringPipeline(supabase: SupabaseClient): Promise<HealthCheck> {
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
      return {
        healthy: !hasBacklog,
        last_run: lastScored.updated_at,
        stale: hasBacklog,
        detail: hasBacklog
          ? `${unscoredCount} unscored, ${Math.round(ageHours)}h since last score`
          : `${unscoredCount ?? 0} unscored`,
      }
    }
    return { healthy: true, detail: `${unscoredCount ?? 0} unscored (no scoring runs yet)` }
  } catch {
    return { healthy: false, detail: 'query failed' }
  }
}
