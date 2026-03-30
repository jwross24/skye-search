import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/admin/sources
 *
 * Per-source discovery statistics: job counts, error rates, last fetch.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Get all discovered jobs grouped by source
  const { data: allJobs } = await supabase
    .from('discovered_jobs')
    .select('source, created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)

  // Get task errors by type (include dead_lettered_at for permanently failed tasks)
  const { data: taskErrors } = await supabase
    .from('task_queue')
    .select('task_type, status, dead_lettered_at, created_at')
    .eq('user_id', user.id)
    .in('task_type', ['exa_search_query', 'exa_find_similar', 'usajobs_search'])
    .gte('created_at', oneWeekAgo)

  const sourceMap: Record<string, string> = {
    exa_search_query: 'exa',
    exa_find_similar: 'exa',
    usajobs_search: 'usajobs',
  }

  // Aggregate per source
  const sources: Record<string, {
    name: string
    jobs24h: number
    jobs7d: number
    jobs30d: number
    lastFetch: string | null
    errorRate7d: number
    totalTasks7d: number
    failedTasks7d: number
  }> = {}

  for (const name of ['exa', 'usajobs']) {
    sources[name] = {
      name,
      jobs24h: 0, jobs7d: 0, jobs30d: 0,
      lastFetch: null, errorRate7d: 0,
      totalTasks7d: 0, failedTasks7d: 0,
    }
  }

  for (const job of allJobs ?? []) {
    const src = job.source ?? 'unknown'
    if (!sources[src]) {
      sources[src] = {
        name: src,
        jobs24h: 0, jobs7d: 0, jobs30d: 0,
        lastFetch: null, errorRate7d: 0,
        totalTasks7d: 0, failedTasks7d: 0,
      }
    }
    sources[src].jobs30d++
    if (job.created_at >= oneWeekAgo) sources[src].jobs7d++
    if (job.created_at >= oneDayAgo) sources[src].jobs24h++
    if (!sources[src].lastFetch || job.created_at > sources[src].lastFetch) {
      sources[src].lastFetch = job.created_at
    }
  }

  for (const task of taskErrors ?? []) {
    const src = sourceMap[task.task_type] ?? task.task_type
    if (!sources[src]) continue
    sources[src].totalTasks7d++
    if (task.status === 'failed_validation' || task.dead_lettered_at != null) {
      sources[src].failedTasks7d++
    }
  }

  for (const src of Object.values(sources)) {
    src.errorRate7d = src.totalTasks7d > 0
      ? Math.round((src.failedTasks7d / src.totalTasks7d) * 100)
      : 0
  }

  return NextResponse.json({ sources: Object.values(sources) })
}
