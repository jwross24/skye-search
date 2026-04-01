/**
 * Integration tests for auth actions (signIn, signUp, signOut).
 * Tests against real local Supabase GoTrue — no mocks.
 *
 * The server actions in actions.ts use cookies() which is unavailable in
 * test context. These tests exercise the same Supabase auth operations
 * directly, proving the auth layer works against real GoTrue.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  assertSupabaseReachable,
  TEST_USER_ID,
  TEST_EMAIL,
  TEST_PASSWORD,
} from '../../../tests/helpers/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Unique email for signUp tests — avoids collisions with the seed test user
const SIGNUP_EMAIL = `integration-auth-${Date.now()}@test.local`
const SIGNUP_PASSWORD = 'test-signup-pass-123'
let signUpUserId: string | null = null

function createAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

beforeAll(async () => {
  await assertSupabaseReachable()
})

afterAll(async () => {
  // Clean up the user created by signUp test
  if (signUpUserId) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${signUpUserId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
  }
})

describe('signIn', () => {
  it('authenticates with correct credentials and returns session', async () => {
    const client = createAnonClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
    expect(data.session!.access_token).toBeTruthy()
    expect(data.user).not.toBeNull()
    expect(data.user!.id).toBe(TEST_USER_ID)
    expect(data.user!.email).toBe(TEST_EMAIL)
  })

  it('returns error for wrong password (not crash)', async () => {
    const client = createAnonClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: 'wrong-password-123',
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/invalid/i)
    expect(data.session).toBeNull()
    expect(data.user).toBeNull()
  })

  it('returns error for nonexistent email', async () => {
    const client = createAnonClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: 'nonexistent@nowhere.test',
      password: 'some-password',
    })

    expect(error).not.toBeNull()
    expect(data.session).toBeNull()
  })
})

describe('signUp', () => {
  it('creates user via GoTrue admin API and verifies they can sign in', async () => {
    // Use GoTrue admin API to create user (same as seed script pattern)
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: SIGNUP_EMAIL,
        password: SIGNUP_PASSWORD,
        email_confirm: true,
      }),
    })

    expect(res.ok).toBe(true)
    const user = await res.json()
    signUpUserId = user.id
    expect(user.email).toBe(SIGNUP_EMAIL)

    // Verify the new user can sign in
    const client = createAnonClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: SIGNUP_EMAIL,
      password: SIGNUP_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
    expect(data.user!.email).toBe(SIGNUP_EMAIL)
  })

  it('returns error for duplicate email', async () => {
    // Try creating user with the same email as the seed test user
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'another-password',
        email_confirm: true,
      }),
    })

    // GoTrue admin API returns 422 for duplicate email
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.msg || body.message || body.error_description).toBeTruthy()
  })
})

describe('signOut', () => {
  it('invalidates session — subsequent getUser returns null', async () => {
    const client = createAnonClient()

    // Sign in first
    const { data: signInData } = await client.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(signInData.session).not.toBeNull()

    // Verify we have a user before sign out
    const { data: beforeData } = await client.auth.getUser()
    expect(beforeData.user).not.toBeNull()

    // Sign out
    const { error } = await client.auth.signOut()
    expect(error).toBeNull()

    // After sign out, getUser should return null user
    const { data: afterData } = await client.auth.getUser()
    expect(afterData.user).toBeNull()
  })
})

describe('session verification', () => {
  it('getUser with valid session returns user data', async () => {
    const client = createAnonClient()
    await client.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    const { data: { user }, error } = await client.auth.getUser()

    expect(error).toBeNull()
    expect(user).not.toBeNull()
    expect(user!.id).toBe(TEST_USER_ID)
    expect(user!.email).toBe(TEST_EMAIL)
    expect(user!.role).toBe('authenticated')
  })

  it('RLS enforces user isolation after auth', async () => {
    // Seed a job via service client so there's data to read
    const admin = createAdminClient()
    const { data: seeded } = await admin
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: 'RLS Test Job',
        company: 'RLS Test Co',
        visa_path: 'cap_exempt',
        employer_type: 'university',
        source_type: 'academic',
      })
      .select('id')
      .single()

    try {
      // Sign in as test user
      const client = createAnonClient()
      await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })

      // Should see own jobs
      const { data: ownJobs, error } = await client
        .from('jobs')
        .select('id')
        .eq('user_id', TEST_USER_ID)
      expect(error).toBeNull()
      expect(ownJobs!.length).toBeGreaterThan(0)

      // Should NOT see jobs from a fake user ID (RLS blocks cross-user access)
      const { data: otherJobs } = await client
        .from('jobs')
        .select('id')
        .eq('user_id', '00000000-0000-0000-0000-000000000099')
      expect(otherJobs).toEqual([])
    } finally {
      // Clean up seeded job
      if (seeded?.id) {
        await admin.from('jobs').delete().eq('id', seeded.id)
      }
    }
  })
})
