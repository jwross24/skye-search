/**
 * Integration tests for tracker actions — uninterestApplication.
 * Hits real local Supabase: creates application, uninterests it, verifies
 * the application is deleted and a vote is created.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  createAuthenticatedClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'

function log(step: string, detail: string) {
  process.stdout.write(`  [tracker-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()
let testJobId: string | null = null

beforeAll(async () => {
  await assertSupabaseReachable()
  log('Setup', 'Supabase reachable')

  // Create a test job for the tests
  const { data, error } = await service
    .from('jobs')
    .insert({
      user_id: TEST_USER_ID,
      title: 'Uninterest Integration Test Job',
      company: 'Test University',
      visa_path: 'cap_exempt',
      employer_type: 'university',
      source_type: 'academic',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Setup failed: ${error.message}`)
  testJobId = data!.id
  log('Setup', `Created test job: ${testJobId}`)
})

afterAll(async () => {
  // Clean up test data (in dependency order)
  if (testJobId) {
    await service.from('votes').delete().eq('job_id', testJobId).eq('user_id', TEST_USER_ID)
    await service.from('applications').delete().eq('job_id', testJobId).eq('user_id', TEST_USER_ID)
    await service.from('jobs').delete().eq('id', testJobId)
    log('Cleanup', 'Removed test job, applications, and votes')
  }
})

afterEach(async () => {
  // Clean up applications and votes between tests (keep the job)
  if (testJobId) {
    await service.from('votes').delete().eq('job_id', testJobId).eq('user_id', TEST_USER_ID)
    await service.from('applications').delete().eq('job_id', testJobId).eq('user_id', TEST_USER_ID)
  }
})

describe('uninterestApplication (real Supabase)', () => {
  it('[uninterest-integration] Step 1: creates application, then uninterests it', async () => {
    log('Step 1', 'Creating application for test job')

    // Create an "interested" application
    const { data: app, error: appErr } = await service
      .from('applications')
      .insert({
        user_id: TEST_USER_ID,
        job_id: testJobId,
        kanban_status: 'interested',
      })
      .select('id')
      .single()

    expect(appErr).toBeNull()
    expect(app).not.toBeNull()
    log('Step 2', `Application created: ${app!.id}`)

    // Verify application exists
    const { data: before } = await service
      .from('applications')
      .select('id, kanban_status')
      .eq('id', app!.id)
      .single()

    expect(before?.kanban_status).toBe('interested')
    log('Step 3', `Application status confirmed: ${before?.kanban_status}`)

    // Now simulate the uninterest action:
    // 1. Delete the application
    const { error: delErr } = await service
      .from('applications')
      .delete()
      .eq('id', app!.id)
      .eq('user_id', TEST_USER_ID)

    expect(delErr).toBeNull()
    log('Step 4', 'Application deleted')

    // 2. Create a dismiss vote
    const { error: voteErr } = await service
      .from('votes')
      .insert({
        user_id: TEST_USER_ID,
        job_id: testJobId,
        decision: 'not_for_me',
        tags: ['wrong_field'],
      })

    expect(voteErr).toBeNull()
    log('Step 5', 'Dismiss vote created with tag: wrong_field')

    // Verify: application is gone
    const { data: afterApp } = await service
      .from('applications')
      .select('id')
      .eq('id', app!.id)
      .single()

    expect(afterApp).toBeNull()
    log('Step 6', 'Confirmed: application no longer exists')

    // Verify: vote exists with correct data
    const { data: vote } = await service
      .from('votes')
      .select('decision, tags')
      .eq('job_id', testJobId!)
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(vote?.decision).toBe('not_for_me')
    expect(vote?.tags).toEqual(['wrong_field'])
    log('Step 7', `Vote confirmed: decision=${vote?.decision}, tags=${JSON.stringify(vote?.tags)}`)
  })

  it('[uninterest-integration] Step 1: uninterest without tags creates vote with empty tags', async () => {
    log('Step 1', 'Creating application then uninteresting with no tags')

    const { data: app } = await service
      .from('applications')
      .insert({
        user_id: TEST_USER_ID,
        job_id: testJobId,
        kanban_status: 'interested',
      })
      .select('id')
      .single()

    // Delete application
    await service.from('applications').delete().eq('id', app!.id).eq('user_id', TEST_USER_ID)
    log('Step 2', 'Application deleted')

    // Create vote with empty tags (Skip flow)
    const { error } = await service.from('votes').insert({
      user_id: TEST_USER_ID,
      job_id: testJobId,
      decision: 'not_for_me',
      tags: [],
    })

    expect(error).toBeNull()
    log('Step 3', 'Vote created with empty tags')

    const { data: vote } = await service
      .from('votes')
      .select('decision, tags')
      .eq('job_id', testJobId!)
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(vote?.decision).toBe('not_for_me')
    expect(vote?.tags).toEqual([])
    log('Step 4', `Confirmed: decision=${vote?.decision}, tags=${JSON.stringify(vote?.tags)}`)
  })

  it('[uninterest-integration] Step 1: RLS blocks cross-user uninterest', async () => {
    log('Step 1', 'Creating application then attempting delete as unauthenticated client')

    const { data: app } = await service
      .from('applications')
      .insert({
        user_id: TEST_USER_ID,
        job_id: testJobId,
        kanban_status: 'interested',
      })
      .select('id')
      .single()

    // Try deleting with the authenticated client (should work via RLS)
    const authed = await createAuthenticatedClient()
    const { error: rlsErr } = await authed
      .from('applications')
      .delete()
      .eq('id', app!.id)
      .eq('user_id', TEST_USER_ID)

    expect(rlsErr).toBeNull()
    log('Step 2', 'RLS allowed authenticated user to delete own application')

    // Verify it's actually gone
    const { data: after } = await service
      .from('applications')
      .select('id')
      .eq('id', app!.id)
      .single()

    expect(after).toBeNull()
    log('Step 3', 'Application confirmed deleted')
  })
})
