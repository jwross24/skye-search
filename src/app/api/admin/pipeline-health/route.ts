import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/admin/pipeline-health
 *
 * Aggregated health status for all 5 pipeline components.
 * Each returns: status (green/yellow/red), lastRun, keyMetric.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // ─── Discovery Pipeline ───────────────────────────────────────────────
  const { data: recentDiscoverTasks } = await supabase
    .from('task_queue')
    .select('id, status, task_type, created_at, result_json, dead_lettered_at')
    .eq('user_id', user.id)
    .in('task_type', ['exa_search_query', 'exa_find_similar', 'usajobs_search'])
    .gte('created_at', oneWeekAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  const discoverCompleted = recentDiscoverTasks?.filter(t => t.status === 'completed').length ?? 0
  const discoverFailed = recentDiscoverTasks?.filter(t => t.status === 'failed_validation' || (t.dead_lettered_at != null && t.status !== 'failed_validation')).length ?? 0
  const lastDiscoverRun = recentDiscoverTasks?.[0]?.created_at ?? null
  const discoverStatus = !lastDiscoverRun ? 'red'
    : discoverFailed > discoverCompleted ? 'red'
    : discoverCompleted === 0 ? 'yellow'
    : 'green'

  // ─── Scoring Pipeline ────────────────────────────────────────────────
  const { data: recentScoreTasks } = await supabase
    .from('task_queue')
    .select('id, status, result_json, created_at')
    .eq('user_id', user.id)
    .eq('task_type', 'ai_score_batch')
    .gte('created_at', oneWeekAgo)
    .order('created_at', { ascending: false })
    .limit(10)

  const lastScoreTask = recentScoreTasks?.[0]
  const scoreResult = lastScoreTask?.result_json as { scored?: number; failed?: number; total?: number } | null
  const scored = scoreResult?.scored ?? 0
  const scoreFailed = scoreResult?.failed ?? 0
  const scoreStatus = !lastScoreTask ? 'red'
    : scoreFailed > 0 && scored === 0 ? 'red'
    : scoreFailed > scored ? 'yellow'
    : 'green'

  // ─── Queue Worker ────────────────────────────────────────────────────
  const { count: pendingCount } = await supabase
    .from('task_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing'])

  const { count: deadLetteredCount } = await supabase
    .from('task_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('dead_lettered_at', 'is', null)
    .gte('created_at', oneWeekAgo)

  const { data: oldestPending } = await supabase
    .from('task_queue')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const oldestPendingAge = oldestPending?.[0]
    ? Math.round((now.getTime() - new Date(oldestPending[0].created_at).getTime()) / 60000)
    : null
  const queueStatus = (deadLetteredCount ?? 0) > 0 ? 'red'
    : (oldestPendingAge ?? 0) > 120 ? 'yellow'
    : 'green'

  // ─── Unemployment Cron ───────────────────────────────────────────────
  const { data: lastCheckpoint } = await supabase
    .from('daily_checkpoint')
    .select('checkpoint_date, status_snapshot, unemployment_days_used_cumulative')
    .eq('user_id', user.id)
    .order('checkpoint_date', { ascending: false })
    .limit(1)

  const { data: lastCronLog } = await supabase
    .from('cron_execution_log')
    .select('execution_date, status, error_message')
    .eq('user_id', user.id)
    .order('execution_date', { ascending: false })
    .limit(1)

  const cronStatus = !lastCronLog?.[0] ? 'yellow'
    : lastCronLog[0].status === 'completed' ? 'green'
    : 'red'

  // ─── Email Alerts ────────────────────────────────────────────────────
  // Check task_queue for alert-related tasks (the alerts endpoint doesn't use api_usage_log)
  const { data: recentAlertTasks } = await supabase
    .from('task_queue')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .like('task_type', '%alert%')
    .gte('created_at', oneWeekAgo)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fallback: check cron_execution_log for alert cron runs
  const alertTaskCount = recentAlertTasks?.length ?? 0
  const alertStatus = alertTaskCount > 0 ? 'green' : 'yellow'

  return NextResponse.json({
    discovery: {
      status: discoverStatus,
      lastRun: lastDiscoverRun,
      completed: discoverCompleted,
      failed: discoverFailed,
      sources: [...new Set(recentDiscoverTasks?.map(t => t.task_type) ?? [])],
    },
    scoring: {
      status: scoreStatus,
      lastRun: lastScoreTask?.created_at ?? null,
      scored,
      failed: scoreFailed,
      total: scoreResult?.total ?? 0,
    },
    queue: {
      status: queueStatus,
      pending: pendingCount ?? 0,
      deadLettered: deadLetteredCount ?? 0,
      oldestPendingMinutes: oldestPendingAge,
    },
    unemployment: {
      status: cronStatus,
      lastCheckpoint: lastCheckpoint?.[0] ?? null,
      lastCronRun: lastCronLog?.[0] ?? null,
    },
    alerts: {
      status: alertStatus,
      recentCount: recentAlertTasks?.length ?? 0,
      lastSent: recentAlertTasks?.[0]?.created_at ?? null,
    },
  })
}
