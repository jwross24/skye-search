import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/admin/task-queue?status=pending&type=usajobs_search&range=24h
 *
 * Filtered view of the task queue with pagination.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const taskType = searchParams.get('type')
  const range = searchParams.get('range') ?? '24h'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const rangeMs: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const since = new Date(Date.now() - (rangeMs[range] ?? rangeMs['24h'])).toISOString()

  let query = supabase
    .from('task_queue')
    .select('id, task_type, status, payload_json, result_json, error_log, retry_count, max_retries, dead_lettered_at, created_at, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (taskType) query = query.eq('task_type', taskType)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate counts by status
  const { data: statusCounts } = await supabase
    .from('task_queue')
    .select('status')
    .eq('user_id', user.id)
    .gte('created_at', since)

  const counts: Record<string, number> = {}
  for (const row of statusCounts ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }

  return NextResponse.json({ tasks: data ?? [], total: count ?? 0, counts })
}
