/**
 * Smoke integration test — proves the test infrastructure works.
 * Hits real local Supabase: auth, insert, read, RLS, cleanup.
 *
 * Note: .env.local is loaded by the helpers/supabase import below — no need
 * to load it again here.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  createAuthenticatedClient,
  createAnonClient,
  resetTestUser,
  seedTestJobs,
  TEST_USER_ID,
  TEST_EMAIL,
} from '../helpers/supabase'

/** Clean up only the jobs this smoke test created — don't nuke seed data. */
async function cleanupSmokeJobs(): Promise<void> {
  const service = createServiceClient()
  await service
    .from('jobs')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .like('title', 'Integration Test Job%')
}

describe('Integration test infrastructure', () => {
  beforeAll(async () => {
    await assertSupabaseReachable()
    await resetTestUser()
  })

  afterAll(async () => {
    await cleanupSmokeJobs()
  })

  it('connects to local Supabase via service client', async () => {
    const service = createServiceClient()
    const { data, error } = await service.from('users').select('id').limit(1)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('authenticates as test user', async () => {
    const client = await createAuthenticatedClient()
    const { data: { user } } = await client.auth.getUser()
    expect(user).not.toBeNull()
    expect(user!.id).toBe(TEST_USER_ID)
    expect(user!.email).toBe(TEST_EMAIL)
  })

  it('inserts and reads jobs via service client', async () => {
    const seeded = await seedTestJobs(2)
    expect(seeded).toHaveLength(2)
    expect(seeded[0].title).toBe('Integration Test Job 1')

    // Read back via service client
    const service = createServiceClient()
    const { data, error } = await service
      .from('jobs')
      .select('id, title')
      .eq('user_id', TEST_USER_ID)
      .like('title', 'Integration Test Job%')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })

  it('RLS blocks unauthenticated access to user data', async () => {
    const anon = createAnonClient()
    const { data, error } = await anon
      .from('jobs')
      .select('id')
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('RLS allows authenticated user to read their own data', async () => {
    const client = await createAuthenticatedClient()
    const { data, error } = await client
      .from('jobs')
      .select('id, title')
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })

  it('cleanup removes seeded smoke test jobs', async () => {
    await cleanupSmokeJobs()
    const service = createServiceClient()
    const { data } = await service
      .from('jobs')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .like('title', 'Integration Test Job%')

    expect(data).toEqual([])
  })
})
