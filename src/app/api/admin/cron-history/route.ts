import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/admin/cron-history?range=30d
 *
 * Cron execution history for the calendar heatmap.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const range = new URL(req.url).searchParams.get('range') ?? '30d'
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Unemployment cron logs
  const { data: cronLogs } = await supabase
    .from('cron_execution_log')
    .select('execution_date, status, trigger_source, error_message, started_at, completed_at, unemployment_days_used_before, unemployment_days_used_after')
    .eq('user_id', user.id)
    .gte('execution_date', since)
    .order('execution_date', { ascending: true })

  // Task-based cron activity (discover, score) — inferred from task_queue
  const { data: cronTasks } = await supabase
    .from('task_queue')
    .select('task_type, status, created_at, result_json')
    .eq('user_id', user.id)
    .in('task_type', ['exa_search_query', 'usajobs_search', 'ai_score_batch'])
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  // Group task activity by day
  const tasksByDay: Record<string, { discover: number; score: number; failed: number }> = {}
  for (const task of cronTasks ?? []) {
    const day = task.created_at.split('T')[0]
    if (!tasksByDay[day]) tasksByDay[day] = { discover: 0, score: 0, failed: 0 }
    if (task.task_type === 'ai_score_batch') {
      tasksByDay[day].score++
    } else {
      tasksByDay[day].discover++
    }
    if (task.status === 'failed_validation') {
      tasksByDay[day].failed++
    }
  }

  return NextResponse.json({
    unemploymentCron: cronLogs ?? [],
    taskActivity: tasksByDay,
    range: days,
  })
}
