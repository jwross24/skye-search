/**
 * Integration test: scoring pipeline partial saves.
 *
 * Tests that the scoring batch correctly handles mixed inputs:
 * - Scorable jobs get scored via Claude API and upserted into jobs table
 * - Empty/short-description jobs get marked scored=true (skipped)
 * - Partial success: scored jobs persist even when some are skipped
 *
 * Requires:
 *   - Local Supabase running: supabase start
 *   - Queue-worker served: supabase functions serve
 *   - ANTHROPIC_API_KEY set in supabase/functions/.env
 *
 * To run: RUN_SCORING_INTEGRATION=1 bun run test -- scoring-retry-integration
 */
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SKIP = !process.env.RUN_SCORING_INTEGRATION

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!
const CRON_SECRET = process.env.CRON_SECRET!

// Unique prefix so concurrent runs don't collide
const RUN_ID = `integ-${Date.now()}`

let supabase: SupabaseClient
const testJobIds: string[] = []
const testTaskIds: string[] = []

function uuid(): string {
  return crypto.randomUUID()
}

function makeDiscoveredJob(overrides: Record<string, unknown> = {}) {
  const id = uuid()
  testJobIds.push(id)
  return {
    id,
    user_id: TEST_USER_ID,
    source: 'integration_test',
    url: `https://example.com/${RUN_ID}/${id}`,
    title: `${RUN_ID} Test Job`,
    company: 'Integration Test Corp',
    raw_description: null as string | null,
    source_type: 'industry',
    scored: false,
    canonical_url: `https://example.com/${RUN_ID}/${id}`,
    created_at: new Date().toISOString(),
    indexed_date: new Date().toISOString(),
    ...overrides,
  }
}

// A real (short) job description that Claude can score
const SCORABLE_DESCRIPTION = `
Position: Environmental Data Scientist
Employer: NOAA Cooperative Institute for Research in Environmental Sciences (CIRES), University of Colorado Boulder
Type: Full-time research position

Requirements:
- PhD in environmental science, oceanography, remote sensing, or related field
- Experience with satellite data processing (MODIS, VIIRS, or similar)
- Proficiency in Python and scientific data formats (NetCDF, HDF5)
- Publication record in peer-reviewed journals

This is a cap-exempt position at a university-affiliated cooperative institute.
Application deadline: 2026-08-15
Location: Boulder, CO
Salary: $75,000 - $95,000
`.trim()

beforeAll(() => {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
})

afterEach(async () => {
  // Clean up in reverse dependency order
  if (testJobIds.length > 0) {
    await supabase.from('api_usage_log').delete().eq('user_id', TEST_USER_ID).eq('task_type', 'ai_score_batch')
    await supabase.from('jobs').delete().in('discovered_job_id', testJobIds)
    await supabase.from('discovered_jobs').delete().in('id', testJobIds)
  }
  if (testTaskIds.length > 0) {
    await supabase.from('task_queue').delete().in('id', testTaskIds)
  }
  testJobIds.length = 0
  testTaskIds.length = 0
})

async function enqueueAndProcess(jobIds: string[]): Promise<{ task: Record<string, unknown>; workerResult: Record<string, unknown> }> {
  // Enqueue scoring task directly
  const taskId = uuid()
  testTaskIds.push(taskId)

  const { error: enqueueError } = await supabase.from('task_queue').insert({
    id: taskId,
    user_id: TEST_USER_ID,
    task_type: 'ai_score_batch',
    payload_json: { job_ids: jobIds },
    status: 'pending',
    max_retries: 2,
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (enqueueError) throw new Error(`Enqueue failed: ${enqueueError.message}`)

  // Invoke queue-worker via HTTP
  const res = await fetch(`${SUPABASE_URL}/functions/v1/queue-worker`, {
    method: 'POST',
    headers: {
      'x-cron-secret': CRON_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batchSize: 1 }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Queue-worker returned ${res.status}: ${text}`)
  }

  const workerResult = await res.json()

  // Fetch completed task to inspect result
  const { data: task } = await supabase
    .from('task_queue')
    .select('*')
    .eq('id', taskId)
    .single()

  return { task: task as Record<string, unknown>, workerResult }
}

describe.skipIf(SKIP)('Scoring pipeline integration', () => {
  it('scores a real job via Claude API and persists to jobs table', async () => {
    const job = makeDiscoveredJob({
      title: `${RUN_ID} CIRES Environmental Scientist`,
      company: 'CIRES / University of Colorado',
      raw_description: SCORABLE_DESCRIPTION,
    })

    await supabase.from('discovered_jobs').insert(job)

    const { task, workerResult } = await enqueueAndProcess([job.id])

    // Worker completed
    expect(workerResult.ok).toBe(true)

    // Task completed successfully
    expect(task.status).toBe('completed')
    const result = task.result_json as Record<string, unknown>
    expect(result.scored).toBe(1)
    expect(result.failed).toBe(0)

    // Job persisted in jobs table
    const { data: scoredJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('discovered_job_id', job.id)

    expect(scoredJobs).toHaveLength(1)
    const scored = scoredJobs![0]
    expect(scored.match_score).toBeGreaterThanOrEqual(0)
    expect(scored.match_score).toBeLessThanOrEqual(1)
    expect(scored.visa_path).toBeTruthy()
    expect(scored.employer_type).toBeTruthy()
    expect(scored.why_fits).toBeTruthy()
    expect(scored.urgency_score).toBeGreaterThanOrEqual(0)

    // Discovered job marked as scored
    const { data: disc } = await supabase
      .from('discovered_jobs')
      .select('scored')
      .eq('id', job.id)
      .single()

    expect(disc!.scored).toBe(true)
  }, 60_000) // 60s timeout — Claude API call is slow

  it('partial batch: scorable jobs persist, empty ones marked scored=true', async () => {
    const scorableJob = makeDiscoveredJob({
      title: `${RUN_ID} NOAA Research Scientist`,
      company: 'NOAA / CIRES',
      raw_description: SCORABLE_DESCRIPTION,
    })

    const emptyJob = makeDiscoveredJob({
      title: `${RUN_ID} Empty Description Job`,
      company: 'Unknown Corp',
      raw_description: '',
    })

    const shortJob = makeDiscoveredJob({
      title: `${RUN_ID} Short Description Job`,
      company: 'Brief Inc',
      raw_description: 'Too short to score.',
    })

    await supabase.from('discovered_jobs').insert([scorableJob, emptyJob, shortJob])

    const { task } = await enqueueAndProcess([scorableJob.id, emptyJob.id, shortJob.id])

    // Task completed
    expect(task.status).toBe('completed')
    const result = task.result_json as Record<string, unknown>
    expect(result.scored).toBe(1)      // Only the scorable job
    expect(result.skipped).toBe(2)     // Empty + short
    expect(result.failed).toBe(0)

    // Scorable job persisted in jobs table
    const { data: scoredJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('discovered_job_id', scorableJob.id)

    expect(scoredJobs).toHaveLength(1)
    expect(scoredJobs![0].match_score).toBeGreaterThanOrEqual(0)

    // Empty/short jobs NOT in jobs table (not scored)
    const { data: emptyScored } = await supabase
      .from('jobs')
      .select('id')
      .in('discovered_job_id', [emptyJob.id, shortJob.id])

    expect(emptyScored).toHaveLength(0)

    // ALL discovered_jobs marked scored=true (including skipped)
    const { data: allDisc } = await supabase
      .from('discovered_jobs')
      .select('id, scored')
      .in('id', [scorableJob.id, emptyJob.id, shortJob.id])

    expect(allDisc).toHaveLength(3)
    expect(allDisc!.every(j => j.scored === true)).toBe(true)
  }, 60_000)

  it('retry metrics are tracked in task result', async () => {
    const job = makeDiscoveredJob({
      title: `${RUN_ID} Retry Metrics Test`,
      company: 'Metrics Corp',
      raw_description: SCORABLE_DESCRIPTION,
    })

    await supabase.from('discovered_jobs').insert(job)

    const { task } = await enqueueAndProcess([job.id])

    expect(task.status).toBe('completed')
    const result = task.result_json as Record<string, unknown>

    // Retry metrics exist in result (may be 0 if no rate limits hit)
    expect(result).toHaveProperty('total_retries')
    expect(result).toHaveProperty('circuit_breaker_trips')
    expect(typeof result.total_retries).toBe('number')
    expect(typeof result.circuit_breaker_trips).toBe('number')
  }, 60_000)
})
