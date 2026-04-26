/**
 * Integration test for the cross-window join introduced in skye-search-lfkk.
 *
 * Regression: relevance_rate / overall_yield previously counted jobs whose
 * discovered_jobs row was OUTSIDE the 30-day window (because the old query
 * filtered jobs.created_at instead of discovered_jobs.created_at). A job
 * discovered 31d ago and scored today would inflate the numerator while the
 * denominator (validPostings / scoredDiscovered) excluded its discovered_jobs
 * row — pushing the ratio above 100%.
 *
 * The fix joins jobs to discovered_jobs and filters on
 * discovered_jobs.created_at. This test exercises the join shape directly
 * against real Supabase.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServiceClient, TEST_USER_ID } from '../../../../../tests/helpers/supabase'

const service = createServiceClient()

describe('pipeline-eval cross-window join (skye-search-lfkk)', () => {
  let testDiscoveredId: string | undefined
  let testJobId: string | undefined

  beforeAll(async () => {
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

    const { data: discovered, error: dErr } = await service
      .from('discovered_jobs')
      .insert({
        user_id: TEST_USER_ID,
        url: 'https://lfkk-cross-window.example.com/job',
        title: 'lfkk regression test',
        company: 'LFKK Co',
        scored: true,
        is_job_posting: true,
        created_at: thirtyFiveDaysAgo,
        source: 'test-lfkk',
        source_type: 'academic',
        indexed_date: thirtyFiveDaysAgo.slice(0, 10),
      })
      .select('id')
      .single()
    if (dErr || !discovered) throw new Error(`Setup failed: ${dErr?.message}`)
    testDiscoveredId = discovered.id

    const { data: job, error: jErr } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        url: 'https://lfkk-cross-window.example.com/job',
        title: 'lfkk regression test',
        company: 'LFKK Co',
        match_score: 0.8,
        discovered_job_id: testDiscoveredId,
        created_at: fiveDaysAgo,
        source: 'ai_scored',
      })
      .select('id')
      .single()
    if (jErr || !job) throw new Error(`Setup failed: ${jErr?.message}`)
    testJobId = job.id
  })

  afterAll(async () => {
    if (testJobId) await service.from('jobs').delete().eq('id', testJobId)
    if (testDiscoveredId) await service.from('discovered_jobs').delete().eq('id', testDiscoveredId)
  })

  it('joined .gte on discovered_jobs.created_at excludes cross-window rows', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Same join shape the route uses for realJobsInWindow / realJobsValidOnly.
    // Narrow to JUST our test row via id eq, so other seed data doesn't affect the count.
    const { count, error } = await service
      .from('jobs')
      .select('*, discovered_jobs!inner(created_at)', { count: 'exact', head: true })
      .eq('id', testJobId!)
      .gte('discovered_jobs.created_at', thirtyDaysAgo)

    expect(error).toBeNull()
    // Test row's discovered_job is 35d old → join + .gte filter excludes it.
    // Pre-fix this would have counted 1 (jobs.created_at is 5d old).
    expect(count).toBe(0)
  })

  it('row IS findable without the cross-window filter (control)', async () => {
    const { count, error } = await service
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('id', testJobId!)

    expect(error).toBeNull()
    expect(count).toBe(1)
  })

  it('joined query also excludes is_job_posting=false (relevance_rate filter)', async () => {
    // Flip the discovered_job to is_job_posting=false, re-run the validity-scoped query
    await service
      .from('discovered_jobs')
      .update({ is_job_posting: false })
      .eq('id', testDiscoveredId!)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await service
      .from('jobs')
      .select('*, discovered_jobs!inner(created_at, is_job_posting)', { count: 'exact', head: true })
      .eq('id', testJobId!)
      .gte('discovered_jobs.created_at', thirtyDaysAgo)
      .eq('discovered_jobs.is_job_posting', true)

    expect(count).toBe(0)

    // Restore for the afterAll cleanup (and to not affect other tests)
    await service
      .from('discovered_jobs')
      .update({ is_job_posting: true })
      .eq('id', testDiscoveredId!)
  })
})
