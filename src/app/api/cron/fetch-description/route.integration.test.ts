/**
 * Integration test for /api/cron/fetch-description (skye-search-llrb).
 *
 * Verifies against REAL local Supabase that the cron endpoint:
 *  - Selects only discovered_jobs rows where raw_description IS NULL AND
 *    description_fetch_attempts < 3
 *  - Skips rows with raw_description populated (already fetched)
 *  - Skips rows at the 3-attempt cap
 *  - Enqueues exactly ONE fetch_description task whose payload contains only
 *    the eligible row id(s)
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServiceClient, TEST_USER_ID } from '../../../../../tests/helpers/supabase'

const service = createServiceClient()
const CRON_SECRET = 'integration-test-cron-secret-llrb'

// Track inserted IDs for cleanup
const inserted: { discovered: string[]; tasks: string[] } = { discovered: [], tasks: [] }

async function insertDiscovered(overrides: {
  rawDescription: string | null
  attempts: number
  createdAt?: string
}): Promise<string> {
  const { data, error } = await service
    .from('discovered_jobs')
    .insert({
      user_id: TEST_USER_ID,
      url: `https://llrb-fetch-desc.example.com/${Math.random().toString(36).slice(2)}`,
      title: 'llrb integration row',
      company: 'LLRB Co',
      source: 'career_page_monitor',
      source_type: 'academic',
      indexed_date: new Date().toISOString(),
      raw_description: overrides.rawDescription,
      description_fetch_attempts: overrides.attempts,
      created_at: overrides.createdAt ?? new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Setup failed: ${error?.message}`)
  inserted.discovered.push(data.id)
  return data.id
}

async function clearFetchDescriptionTasks(): Promise<void> {
  // Wipe any prior fetch_description tasks for the test user so the idempotency
  // window doesn't carry across test runs.
  const { data } = await service
    .from('task_queue')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('task_type', 'fetch_description')
    .select('id')
  for (const row of data ?? []) inserted.tasks.push(row.id)
}

describe('POST /api/cron/fetch-description (integration)', () => {
  let freshId: string
  let alreadyFetchedId: string
  let cappedId: string

  beforeAll(async () => {
    process.env.CRON_SECRET = CRON_SECRET
    // Ensure required Supabase env vars are present (loaded from .env.local above)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing — check .env.local')
    }

    await clearFetchDescriptionTasks()

    // Seed three rows representing the three branches of the selection logic.
    // Order matters: we want freshId to be the OLDEST (created_at) so the
    // route's `order('created_at', ASC)` picks it up first.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    freshId = await insertDiscovered({
      rawDescription: null,
      attempts: 0,
      createdAt: twoHoursAgo, // oldest = highest priority
    })
    alreadyFetchedId = await insertDiscovered({
      rawDescription: 'Existing description text from prior fetch',
      attempts: 1,
      createdAt: oneHourAgo,
    })
    cappedId = await insertDiscovered({
      rawDescription: null,
      attempts: 3, // at the 3-attempt cap
      createdAt: fiveMinAgo,
    })
  })

  afterAll(async () => {
    // Clean up in dependency-safe order: tasks first (no FK to discovered_jobs)
    if (inserted.tasks.length > 0) {
      await service.from('task_queue').delete().in('id', inserted.tasks)
    }
    // Pick up any fetch_description task created during the tests
    await service
      .from('task_queue')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('task_type', 'fetch_description')

    if (inserted.discovered.length > 0) {
      await service.from('discovered_jobs').delete().in('id', inserted.discovered)
    }
  })

  beforeEach(async () => {
    // Clear any pending fetch_description tasks so the idempotency check
    // doesn't fail between tests in the same run.
    await service
      .from('task_queue')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('task_type', 'fetch_description')
  })

  it('enqueues exactly one fetch_description task referencing only the fresh row', async () => {
    const { POST } = await import('./route')

    const headers = new Headers()
    headers.set('authorization', `Bearer ${CRON_SECRET}`)
    const req = new NextRequest('http://localhost:3000/api/cron/fetch-description', {
      method: 'POST',
      headers,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(1)
    // Only freshId is eligible (alreadyFetched has raw_description; capped is at attempts=3).
    // jobs_to_fetch is the size of THIS batch's payload — must be 1 for the fresh row.
    expect(body.jobs_to_fetch).toBe(1)

    // Verify the task in task_queue
    const { data: tasks } = await service
      .from('task_queue')
      .select('id, task_type, status, payload_json')
      .eq('user_id', TEST_USER_ID)
      .eq('task_type', 'fetch_description')

    expect(tasks).toHaveLength(1)
    const task = tasks![0]
    expect(task.task_type).toBe('fetch_description')
    expect(task.status).toBe('pending')
    const payload = task.payload_json as { discovered_job_ids: string[] }
    expect(payload.discovered_job_ids).toEqual([freshId])
    expect(payload.discovered_job_ids).not.toContain(alreadyFetchedId)
    expect(payload.discovered_job_ids).not.toContain(cappedId)
  })

  it('returns 401 with wrong secret', async () => {
    const { POST } = await import('./route')
    const headers = new Headers()
    headers.set('authorization', 'Bearer wrong')
    const req = new NextRequest('http://localhost:3000/api/cron/fetch-description', {
      method: 'POST',
      headers,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('migration trigger: INSERT with raw_description set auto-stamps description_fetched_at', async () => {
    // Adapter rows (Exa, USAJobs, AJO RSS, jobsgcca) insert rows with
    // raw_description populated but no description_fetched_at — the trigger
    // added in migration 20260426190000 should stamp it for them so the
    // score cron's new filter doesn't accidentally exclude them.
    const { data, error } = await service
      .from('discovered_jobs')
      .insert({
        user_id: TEST_USER_ID,
        url: `https://llrb-trigger.example.com/${Math.random().toString(36).slice(2)}`,
        title: 'llrb trigger row',
        company: 'LLRB Trigger Co',
        source: 'exa',
        source_type: 'academic',
        indexed_date: new Date().toISOString(),
        raw_description: 'Adapter-fetched description text body',
        // description_fetched_at intentionally omitted — trigger should stamp it
      })
      .select('id, description_fetched_at')
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.description_fetched_at).not.toBeNull()
    inserted.discovered.push(data!.id)
  })

  it('idempotency: skips when a fetch_description task is already pending < 30min', async () => {
    // Seed a pending task in the window
    const { data, error } = await service
      .from('task_queue')
      .insert({
        user_id: TEST_USER_ID,
        task_type: 'fetch_description',
        status: 'pending',
        payload_json: { discovered_job_ids: [freshId] },
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Could not seed pending task: ${error?.message}`)
    inserted.tasks.push(data.id)

    const { POST } = await import('./route')
    const headers = new Headers()
    headers.set('authorization', `Bearer ${CRON_SECRET}`)
    const req = new NextRequest('http://localhost:3000/api/cron/fetch-description', {
      method: 'POST',
      headers,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toContain('pending')

    // Still only the seeded task — no second task enqueued
    const { data: tasks } = await service
      .from('task_queue')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .eq('task_type', 'fetch_description')
    expect(tasks).toHaveLength(1)
  })
})
