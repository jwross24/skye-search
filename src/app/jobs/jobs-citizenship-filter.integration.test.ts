/**
 * Integration test: /jobs page citizenship filter.
 * Verifies that requires_citizenship and requires_security_clearance
 * jobs are excluded from the query at the database level.
 *
 * Uses real Supabase — no mocks.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createServiceClient,
  createAuthenticatedClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

function log(step: string, detail: string) {
  process.stdout.write(`  [citizenship-filter] Step ${step}: ${detail}\n`)
}

let service: SupabaseClient
let authed: SupabaseClient

const JOB_IDS = {
  normal: 'c1700000-0000-0000-0000-000000000001',
  citizenship: 'c1700000-0000-0000-0000-000000000002',
  clearance: 'c1700000-0000-0000-0000-000000000003',
  both: 'c1700000-0000-0000-0000-000000000004',
  nullFields: 'c1700000-0000-0000-0000-000000000005',
}

beforeAll(async () => {
  service = createServiceClient()
  authed = await createAuthenticatedClient()

  // Seed test jobs
  const baseJob = {
    user_id: TEST_USER_ID,
    title: 'Test Job',
    company: 'Test Corp',
    location: 'Boston, MA',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    source_type: 'academic',
    indexed_date: new Date().toISOString().split('T')[0],
  }

  const { error } = await service.from('jobs').upsert([
    { ...baseJob, id: JOB_IDS.normal, title: 'Normal Job', requires_citizenship: false, requires_security_clearance: false },
    { ...baseJob, id: JOB_IDS.citizenship, title: 'Citizenship Required', requires_citizenship: true, requires_security_clearance: false },
    { ...baseJob, id: JOB_IDS.clearance, title: 'Clearance Required', requires_citizenship: false, requires_security_clearance: true },
    { ...baseJob, id: JOB_IDS.both, title: 'Both Required', requires_citizenship: true, requires_security_clearance: true },
    { ...baseJob, id: JOB_IDS.nullFields, title: 'Null Fields Job', requires_citizenship: null, requires_security_clearance: null },
  ])

  if (error) throw new Error(`Seed failed: ${error.message}`)
  log('setup', `Seeded 5 test jobs (1 normal, 1 null fields, 3 ineligible)`)
})

afterAll(async () => {
  // Clean up test jobs
  await service.from('jobs').delete().in('id', Object.values(JOB_IDS))
  log('cleanup', 'Removed test jobs')
})

describe('Jobs citizenship filter (real Supabase)', () => {
  it('query with .or filters excludes citizenship-required jobs but keeps nulls', async () => {
    log('1', 'Running filtered query (matches page.tsx .or pattern)')

    const { data, error } = await authed
      .from('jobs')
      .select('id, title, requires_citizenship, requires_security_clearance')
      .eq('user_id', TEST_USER_ID)
      .or('requires_citizenship.is.null,requires_citizenship.neq.true')
      .or('requires_security_clearance.is.null,requires_security_clearance.neq.true')

    expect(error).toBeNull()
    log('2', `Got ${data?.length} jobs after filter`)

    const ids = data?.map((j) => j.id) ?? []
    expect(ids).toContain(JOB_IDS.normal)
    expect(ids).toContain(JOB_IDS.nullFields)
    expect(ids).not.toContain(JOB_IDS.citizenship)
    expect(ids).not.toContain(JOB_IDS.clearance)
    expect(ids).not.toContain(JOB_IDS.both)
    log('3', 'Normal + null-fields jobs returned, 3 ineligible filtered')
  })

  it('query without filter returns all jobs including citizenship-required', async () => {
    log('1', 'Running unfiltered query')

    const { data, error } = await authed
      .from('jobs')
      .select('id, title')
      .eq('user_id', TEST_USER_ID)
      .in('id', Object.values(JOB_IDS))

    expect(error).toBeNull()
    log('2', `Got ${data?.length} jobs without filter`)

    expect(data?.length).toBe(5)
    log('3', 'All 5 jobs present when unfiltered')
  })
})
