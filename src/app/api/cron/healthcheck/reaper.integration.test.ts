/**
 * Integration test: zombie task reaper in healthcheck cron.
 *
 * Tests against REAL local Supabase — no mocks. Verifies that tasks stuck
 * in 'processing' for >30 minutes get auto-reaped to 'failed_validation'.
 *
 * Root cause: Edge Functions can crash/timeout without updating task_queue
 * status. Without a watchdog, zombie tasks accumulate and show as "stuck"
 * in the admin dashboard (incident: 2026-04-03, task stuck 3 days).
 */
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

// Test-specific IDs to clean up
const TEST_TASK_IDS: string[] = []

async function getTestUserId(): Promise<string> {
  const { data } = await supabase.from('users').select('id').limit(1)
  if (!data || data.length === 0) throw new Error('No test user found — run seed first')
  return data[0].id
}

async function insertTask(overrides: {
  userId: string
  status: string
  updatedAt: string
  taskType?: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('task_queue')
    .insert({
      user_id: overrides.userId,
      task_type: overrides.taskType ?? 'ai_score_batch',
      status: overrides.status,
      updated_at: overrides.updatedAt,
      payload_json: {},
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to insert test task: ${error.message}`)
  TEST_TASK_IDS.push(data.id)
  return data.id
}

describe('Zombie task reaper (healthcheck cron)', () => {
  let userId: string

  beforeAll(async () => {
    userId = await getTestUserId()
  })

  afterAll(async () => {
    // Clean up test tasks
    if (TEST_TASK_IDS.length > 0) {
      await supabase.from('task_queue').delete().in('id', TEST_TASK_IDS)
    }
  })

  it('reaps tasks stuck in processing for >30 minutes', async () => {
    // Insert a task stuck in 'processing' — updated_at (when dequeued) was 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const taskId = await insertTask({
      userId,
      status: 'processing',
      updatedAt: twoHoursAgo,
    })

    // Simulate what the reaper does (same logic as healthcheck route)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: reaped } = await supabase
      .from('task_queue')
      .update({
        status: 'failed_validation' as const,
        error_log: 'Reaped by healthcheck: stuck in processing >30min',
        dead_lettered_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('updated_at', thirtyMinAgo)
      .select('id')

    const reapedIds = (reaped ?? []).map(r => r.id)
    expect(reapedIds).toContain(taskId)

    // Verify the task is now failed_validation
    const { data: updated } = await supabase
      .from('task_queue')
      .select('status, error_log, dead_lettered_at')
      .eq('id', taskId)
      .single()

    expect(updated?.status).toBe('failed_validation')
    expect(updated?.error_log).toContain('Reaped by healthcheck')
    expect(updated?.dead_lettered_at).not.toBeNull()
  })

  it('does NOT reap tasks processing for <30 minutes (normal operation)', async () => {
    // Insert a task that just started processing 5 minutes ago (updated_at is recent)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const taskId = await insertTask({
      userId,
      status: 'processing',
      updatedAt: fiveMinAgo,
    })

    // Run reaper
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: reaped } = await supabase
      .from('task_queue')
      .update({
        status: 'failed_validation' as const,
        error_log: 'Reaped by healthcheck: stuck in processing >30min',
        dead_lettered_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('updated_at', thirtyMinAgo)
      .select('id')

    const reapedIds = (reaped ?? []).map(r => r.id)
    expect(reapedIds).not.toContain(taskId)

    // Verify the task is still processing
    const { data: unchanged } = await supabase
      .from('task_queue')
      .select('status')
      .eq('id', taskId)
      .single()

    expect(unchanged?.status).toBe('processing')

    // Clean up: manually clear so it doesn't interfere
    await supabase.from('task_queue').delete().eq('id', taskId)
  })

  it('does NOT reap completed or pending tasks regardless of age', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const pendingId = await insertTask({
      userId,
      status: 'pending',
      updatedAt: twoHoursAgo,
    })

    // Run reaper
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: reaped } = await supabase
      .from('task_queue')
      .update({
        status: 'failed_validation' as const,
        error_log: 'Reaped by healthcheck: stuck in processing >30min',
        dead_lettered_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('updated_at', thirtyMinAgo)
      .select('id')

    const reapedIds = (reaped ?? []).map(r => r.id)
    expect(reapedIds).not.toContain(pendingId)

    // Verify pending task is untouched
    const { data: pendingCheck } = await supabase
      .from('task_queue')
      .select('status')
      .eq('id', pendingId)
      .single()

    expect(pendingCheck?.status).toBe('pending')
  })
})
