import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * POST /api/admin/retry-task
 * Body: { taskId: string }
 *
 * Retries a dead-lettered or failed task by resetting its status to pending.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const taskId = body?.taskId
  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  // Verify task belongs to user and is retryable
  const { data: task } = await supabase
    .from('task_queue')
    .select('id, status, dead_lettered_at')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (task.status !== 'failed_validation' && !task.dead_lettered_at) {
    return NextResponse.json({ error: `Task is ${task.status}, not retryable` }, { status: 400 })
  }

  const { error } = await supabase
    .from('task_queue')
    .update({
      status: 'pending',
      error_log: null,
      retry_count: 0,
      dead_lettered_at: null,
      next_retry_at: null,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, taskId })
}
