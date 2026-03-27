/**
 * Task queue enqueue helper for server actions and API routes.
 * Uses service-role client (no user session needed).
 */
import { createClient } from '@supabase/supabase-js'

export interface EnqueueParams {
  userId: string
  taskType: string
  payload: Record<string, unknown>
  maxRetries?: number
  /** If provided, skips enqueue when a pending/processing task of the same type exists for this user within the window */
  idempotencyWindowMinutes?: number
}

export interface EnqueueResult {
  taskId: string
  skipped: boolean
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function enqueueTask(params: EnqueueParams): Promise<EnqueueResult> {
  const supabase = getServiceClient()

  // Idempotency check
  if (params.idempotencyWindowMinutes) {
    const windowStart = new Date(
      Date.now() - params.idempotencyWindowMinutes * 60 * 1000,
    ).toISOString()

    const { count, error } = await supabase
      .from('task_queue')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('task_type', params.taskType)
      .in('status', ['pending', 'processing'])
      .gte('created_at', windowStart)

    if (error) throw new Error(`Idempotency check failed: ${error.message}`)
    if ((count ?? 0) > 0) return { taskId: '', skipped: true }
  }

  const { data, error } = await supabase
    .from('task_queue')
    .insert({
      user_id: params.userId,
      task_type: params.taskType,
      payload_json: params.payload,
      max_retries: params.maxRetries ?? 3,
    })
    .select('id')
    .single()

  if (error) throw new Error(`enqueueTask failed: ${error.message}`)
  return { taskId: data.id, skipped: false }
}
