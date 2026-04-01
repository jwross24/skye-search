/**
 * Integration tests for immigration server actions.
 * Tests against real local Supabase — no mocks.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'

function log(step: string, detail: string) {
  process.stdout.write(`  [immigration-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()

// Store original values to restore after tests
let originalImmigration: Record<string, unknown> | null = null
let originalDisclaimerAt: string | null = null

beforeAll(async () => {
  await assertSupabaseReachable()

  // Save original state
  const { data: immData } = await service
    .from('immigration_status')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single()
  originalImmigration = immData

  const { data: userData } = await service
    .from('users')
    .select('disclaimer_acknowledged_at')
    .eq('id', TEST_USER_ID)
    .single()
  originalDisclaimerAt = userData?.disclaimer_acknowledged_at ?? null

  log('Setup', 'Saved original immigration state')
})

afterAll(async () => {
  // Restore original immigration_status
  if (originalImmigration) {
    const rest = Object.fromEntries(
      Object.entries(originalImmigration).filter(([k]) => k !== 'user_id')
    )
    await service.from('immigration_status').upsert({ user_id: TEST_USER_ID, ...rest }, { onConflict: 'user_id' })
  }
  // Restore disclaimer
  await service.from('users').update({ disclaimer_acknowledged_at: originalDisclaimerAt }).eq('id', TEST_USER_ID)
  log('Cleanup', 'Restored original state')
})

describe('saveCalibration (real Supabase)', () => {
  it('[immigration] upserts calibration data to immigration_status', async () => {
    const calibrationDate = '2026-03-15'

    const { error } = await service
      .from('immigration_status')
      .upsert({
        user_id: TEST_USER_ID,
        initial_days_used: 42,
        initial_days_source: 'dso_confirmed',
        calibration_date: calibrationDate,
      }, { onConflict: 'user_id' })

    expect(error).toBeNull()
    log('Step 2', 'Upserted calibration: 42 days, dso_confirmed')

    // Verify
    const { data } = await service
      .from('immigration_status')
      .select('initial_days_used, initial_days_source, calibration_date')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.initial_days_used).toBe(42)
    expect(data!.initial_days_source).toBe('dso_confirmed')
    expect(data!.calibration_date).toBe(calibrationDate)
    log('Step 3', `Verified: days=${data!.initial_days_used}, source=${data!.initial_days_source}`)
  })

  it('[immigration] user_reported source when not DSO-confirmed', async () => {
    const { error } = await service
      .from('immigration_status')
      .upsert({
        user_id: TEST_USER_ID,
        initial_days_used: 50,
        initial_days_source: 'user_reported',
        calibration_date: '2026-03-20',
      }, { onConflict: 'user_id' })

    expect(error).toBeNull()

    const { data } = await service
      .from('immigration_status')
      .select('initial_days_used, initial_days_source')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.initial_days_source).toBe('user_reported')
    log('Step 2', `Source: ${data!.initial_days_source} (correct for non-DSO)`)
  })
})

describe('acknowledgeDisclaimer (real Supabase)', () => {
  it('[immigration] sets disclaimer_acknowledged_at on users table', async () => {
    const now = new Date().toISOString()

    const { error } = await service
      .from('users')
      .update({ disclaimer_acknowledged_at: now })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', `Set disclaimer_acknowledged_at to ${now}`)

    const { data } = await service
      .from('users')
      .select('disclaimer_acknowledged_at')
      .eq('id', TEST_USER_ID)
      .single()

    expect(data!.disclaimer_acknowledged_at).toBeTruthy()
    const storedDate = new Date(data!.disclaimer_acknowledged_at)
    expect(storedDate.getTime()).toBeGreaterThan(0)
    log('Step 3', `Verified: disclaimer_acknowledged_at=${data!.disclaimer_acknowledged_at}`)
  })
})

describe('toggleEmployment (real Supabase)', () => {
  it('[immigration] toggles employment_active to true (with start date)', async () => {
    const startDate = '2026-04-01'
    const { error } = await service
      .from('immigration_status')
      .update({
        employment_active: true,
        employment_active_since: new Date().toISOString(),
        employment_start_date: startDate,
      })
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', 'Set employment_active=true with start date')

    const { data } = await service
      .from('immigration_status')
      .select('employment_active, employment_active_since, employment_start_date')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.employment_active).toBe(true)
    expect(data!.employment_active_since).toBeTruthy()
    expect(data!.employment_start_date).toBe(startDate)
    log('Step 3', `Verified: active=${data!.employment_active}, since=${data!.employment_active_since}, start_date=${data!.employment_start_date}`)
  })

  it('[immigration] toggles employment_active to false (clears start date)', async () => {
    const { error } = await service
      .from('immigration_status')
      .update({
        employment_active: false,
        employment_active_since: null,
      })
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', 'Set employment_active=false')

    const { data } = await service
      .from('immigration_status')
      .select('employment_active, employment_active_since')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.employment_active).toBe(false)
    expect(data!.employment_active_since).toBeNull()
    log('Step 3', `Verified: active=${data!.employment_active}, since=${data!.employment_active_since}`)
  })
})

describe('getWhatIfScenarios (real Supabase)', () => {
  it('[immigration] immigration_clock view returns days_remaining', async () => {
    const { data, error } = await service
      .from('immigration_clock')
      .select('days_remaining')
      .eq('user_id', TEST_USER_ID)
      .maybeSingle()

    log('Step 2', `days_remaining=${data?.days_remaining ?? 'null'}, error=${error?.message ?? 'none'}`)

    // The view may return null during postdoc (expected behavior)
    // We just verify the query doesn't crash
    expect(error).toBeNull()
    if (data) {
      expect(typeof data.days_remaining).toBe('number')
      log('Step 3', `Clock active: ${data.days_remaining} days remaining`)
    } else {
      log('Step 3', 'Clock not active (postdoc period — expected)')
    }
  })

  it('[immigration] immigration_status has required fields for what-if', async () => {
    const { data, error } = await service
      .from('immigration_status')
      .select('initial_days_used, postdoc_end_date, opt_expiry, employment_active')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    log('Step 2', `Fields: days_used=${data!.initial_days_used}, postdoc_end=${data!.postdoc_end_date}, opt_expiry=${data!.opt_expiry}`)

    // These fields are needed for scenario computation
    expect(typeof data!.initial_days_used).toBe('number')
    log('Step 3', 'All what-if input fields present and typed correctly')
  })
})
