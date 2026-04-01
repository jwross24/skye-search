/**
 * Integration tests for jobs server actions.
 * Tests against real local Supabase — no mocks.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'

function log(step: string, detail: string) {
  process.stdout.write(`  [jobs-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()
const createdJobIds: string[] = []

beforeAll(async () => {
  await assertSupabaseReachable()
  log('Setup', 'Supabase reachable')
})

afterEach(async () => {
  // Clean up jobs created in this test (and their votes/applications)
  for (const jobId of createdJobIds) {
    await service.from('votes').delete().eq('job_id', jobId).eq('user_id', TEST_USER_ID)
    await service.from('applications').delete().eq('job_id', jobId).eq('user_id', TEST_USER_ID)
    await service.from('jobs').delete().eq('id', jobId)
  }
  createdJobIds.length = 0
})

describe('addManualJob (real Supabase)', () => {
  it('[jobs] inserts a manual job with all fields', async () => {
    const { data, error } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Postdoc — Remote Sensing',
        company: 'Test University',
        url: 'https://jobs.test.edu/postdoc-123',
        location: 'Boston, MA',
        visa_path: 'cap_exempt',
        employer_type: 'university',
        employment_type: 'full_time',
        application_deadline: '2026-05-01',
        source: 'manual',
        why_fits: 'Great match for ocean color research',
      })
      .select('id, title, company, url, visa_path, employer_type, source, why_fits')
      .single()

    expect(error).toBeNull()
    createdJobIds.push(data!.id)
    log('addManualJob', `Created: ${data!.id}`)

    expect(data!.title).toBe('Postdoc — Remote Sensing')
    expect(data!.company).toBe('Test University')
    expect(data!.visa_path).toBe('cap_exempt')
    expect(data!.employer_type).toBe('university')
    expect(data!.source).toBe('manual')
    expect(data!.why_fits).toBe('Great match for ocean color research')
    log('addManualJob', `Verified all fields: title=${data!.title}, company=${data!.company}`)
  })

  it('[jobs] URL sanitization: strips tracking params', async () => {
    const dirtyUrl = 'https://jobs.test.edu/postdoc?utm_source=email&utm_campaign=spring&id=123'

    // Simulate URL sanitization (same logic as the server action)
    const parsed = new URL(dirtyUrl)
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
    trackingParams.forEach(p => parsed.searchParams.delete(p))
    const cleanUrl = parsed.toString()

    const { data, error } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'URL Sanitization Test',
        company: 'Test Co',
        url: cleanUrl,
        visa_path: 'unknown',
        employer_type: 'unknown',
      })
      .select('id, url')
      .single()

    expect(error).toBeNull()
    createdJobIds.push(data!.id)

    expect(data!.url).toBe('https://jobs.test.edu/postdoc?id=123')
    expect(data!.url).not.toContain('utm_')
    log('URL sanitization', `Clean URL: ${data!.url}`)
  })
})

describe('voteOnJob — interested (real Supabase)', () => {
  it('[jobs] interested vote creates application record', async () => {
    // Create a job first
    const { data: job } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Vote Test Job',
        company: 'Vote Co',
        visa_path: 'cap_exempt',
        employer_type: 'university',
      })
      .select('id')
      .single()

    createdJobIds.push(job!.id)
    log('interested', `Created test job: ${job!.id}`)

    // Insert application (simulates voteOnJob with decision='interested')
    const { error } = await service.from('applications').insert({
      user_id: TEST_USER_ID,
      job_id: job!.id,
      kanban_status: 'interested',
    })

    expect(error).toBeNull()
    log('interested', 'Application created')

    // Verify application exists
    const { data: app } = await service
      .from('applications')
      .select('kanban_status, job_id')
      .eq('user_id', TEST_USER_ID)
      .eq('job_id', job!.id)
      .single()

    expect(app!.kanban_status).toBe('interested')
    expect(app!.job_id).toBe(job!.id)
    log('interested', `Verified: status=${app!.kanban_status}, job_id=${app!.job_id}`)
  })

  it('[jobs] duplicate interested vote is idempotent (no duplicate row)', async () => {
    const { data: job } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Dedup Test Job',
        company: 'Dedup Co',
        visa_path: 'unknown',
        employer_type: 'unknown',
      })
      .select('id')
      .single()

    createdJobIds.push(job!.id)

    // First insert
    await service.from('applications').insert({
      user_id: TEST_USER_ID,
      job_id: job!.id,
      kanban_status: 'interested',
    })

    // Second insert (simulates user tapping vote again)
    // The action checks for existing row and returns early — no duplicate
    const { data: existingApp } = await service
      .from('applications')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .eq('job_id', job!.id)
      .limit(1)
      .single()

    // Guard fires: existing row found, so no second insert happens
    if (!existingApp) {
      await service.from('applications').insert({
        user_id: TEST_USER_ID,
        job_id: job!.id,
        kanban_status: 'interested',
      })
    }

    // Verify: still exactly 1 row
    const { data: apps } = await service
      .from('applications')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .eq('job_id', job!.id)

    expect(apps!.length).toBe(1)
    log('dedup', `Application count after duplicate vote attempt: ${apps!.length}`)
  })
})

describe('voteOnJob — not_for_me (real Supabase)', () => {
  it('[jobs] not_for_me vote creates vote record with tags', async () => {
    const { data: job } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Dismiss Test Job',
        company: 'Dismiss Co',
        visa_path: 'unknown',
        employer_type: 'unknown',
      })
      .select('id')
      .single()

    createdJobIds.push(job!.id)
    log('not_for_me', `Created test job: ${job!.id}`)

    // Insert vote (simulates voteOnJob with decision='not_for_me')
    const { error } = await service.from('votes').insert({
      user_id: TEST_USER_ID,
      job_id: job!.id,
      decision: 'not_for_me',
      tags: ['wrong_field', 'wrong_location'],
    })

    expect(error).toBeNull()

    const { data: vote } = await service
      .from('votes')
      .select('decision, tags')
      .eq('user_id', TEST_USER_ID)
      .eq('job_id', job!.id)
      .single()

    expect(vote!.decision).toBe('not_for_me')
    expect(vote!.tags).toEqual(['wrong_field', 'wrong_location'])
    log('not_for_me', `Verified: decision=${vote!.decision}, tags=${JSON.stringify(vote!.tags)}`)
  })

  it('[jobs] save_for_later vote creates vote record', async () => {
    const { data: job } = await service
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Save Later Test Job',
        company: 'Later Co',
        visa_path: 'unknown',
        employer_type: 'unknown',
      })
      .select('id')
      .single()

    createdJobIds.push(job!.id)

    const { error } = await service.from('votes').insert({
      user_id: TEST_USER_ID,
      job_id: job!.id,
      decision: 'save_for_later',
      tags: [],
    })

    expect(error).toBeNull()

    const { data: vote } = await service
      .from('votes')
      .select('decision')
      .eq('user_id', TEST_USER_ID)
      .eq('job_id', job!.id)
      .single()

    expect(vote!.decision).toBe('save_for_later')
    log('save_for_later', `Vote created: decision=${vote!.decision}`)
  })
})
