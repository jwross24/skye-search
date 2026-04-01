/**
 * Integration test helpers for real Supabase.
 *
 * Creates service-role and anon clients against local Docker Supabase.
 * Every integration test file should use these helpers — never vi.mock Supabase.
 */

import { config } from 'dotenv'
import path from 'path'

// Load .env.local BEFORE any Supabase imports read process.env
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Constants ────────────────────────────────────────────────────────────────

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_EMAIL = 'dev@skye-search.test'
export const TEST_PASSWORD = 'testpass123'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing ${name} — is .env.local loaded and local Supabase running?`)
  return val
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = requireEnv('SUPABASE_SECRET_KEY')
const ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

// ─── Client factories ─────────────────────────────────────────────────────────

/** Service-role client — bypasses RLS. Use for setup/teardown/assertions. */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Anon client — respects RLS. Use for testing what users actually experience. */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Anon client signed in as the test user — respects RLS with auth context.
 * This is the closest analog to a real user session in integration tests.
 */
export async function createAuthenticatedClient(): Promise<SupabaseClient> {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error) {
    throw new Error(
      `Failed to sign in as test user (${TEST_EMAIL}): ${error.message}. ` +
      `Run: bun run src/db/seed-to-supabase.ts`
    )
  }
  return client
}

// ─── Test data management ─────────────────────────────────────────────────────

/**
 * Reset the test user to a clean state:
 * 1. Delete user via GoTrue admin API
 * 2. Recreate with known credentials
 * 3. Wait for auth.users → public.users trigger
 */
export async function resetTestUser(): Promise<void> {
  // Delete existing user (ignore errors — may not exist)
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${TEST_USER_ID}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })

  // Create fresh user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Failed to create test user: ${JSON.stringify(err)}`)
  }
}

/**
 * Seed minimal test data for a specific table.
 * Returns the inserted rows for assertions.
 */
export async function seedTestJobs(
  count = 3,
): Promise<Array<{ id: string; title: string }>> {
  const service = createServiceClient()
  const jobs = Array.from({ length: count }, (_, i) => ({
    user_id: TEST_USER_ID,
    title: `Integration Test Job ${i + 1}`,
    company: `Test Company ${i + 1}`,
    visa_path: 'cap_exempt' as const,
    employer_type: 'university' as const,
    source_type: 'academic' as const,
  }))

  const { data, error } = await service
    .from('jobs')
    .insert(jobs)
    .select('id, title')

  if (error) throw new Error(`seedTestJobs failed: ${error.message}`)
  return data!
}

/**
 * Clean up ALL test user data across all tables.
 * Order matters — respects foreign key constraints.
 */
export async function cleanupTestData(): Promise<void> {
  const service = createServiceClient()
  const userId = TEST_USER_ID

  // Delete in dependency order (children first)
  await service.from('applications').delete().eq('user_id', userId)
  await service.from('job_votes').delete().eq('user_id', userId)
  await service.from('jobs').delete().eq('user_id', userId)
  await service.from('contacts').delete().eq('user_id', userId)
  await service.from('plans').delete().eq('user_id', userId)
  await service.from('immigration_status').delete().eq('user_id', userId)
  await service.from('daily_checkpoint').delete().eq('user_id', userId)
  await service.from('cron_execution_log').delete().eq('user_id', userId)
}

// ─── Assertions helpers ───────────────────────────────────────────────────────

/** Quick check that local Supabase is reachable. Throws if not. */
export async function assertSupabaseReachable(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    throw new Error(
      `Local Supabase not reachable at ${SUPABASE_URL}. Run: supabase start\n` +
      `Original error: ${err}`
    )
  }
}
