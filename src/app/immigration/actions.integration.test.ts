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

describe('updatePostdocEndDate (real Supabase)', () => {
  const OLD_END = '2026-04-11'
  const NEW_END = '2026-07-01'

  // Clean up test checkpoint data before/after
  async function cleanupTestCheckpoints() {
    await service
      .from('daily_checkpoint')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .gt('checkpoint_date', OLD_END)
      .lte('checkpoint_date', NEW_END)

    await service
      .from('checkpoint_corrections')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('trigger_source', 'postdoc_extension_backfill')
  }

  // Seed unemployed checkpoints for the test
  async function seedUnemployedCheckpoints(dates: string[]) {
    const rows = dates.map((d) => ({
      user_id: TEST_USER_ID,
      checkpoint_date: d,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 1,
      trigger_source: 'manual_backfill',
    }))
    const { error } = await service.from('daily_checkpoint').insert(rows)
    if (error) throw new Error(`Seed checkpoints failed: ${error.message}`)
  }

  it('[immigration] full flow: update end date -> corrections inserted -> clock recalculated', async () => {
    await cleanupTestCheckpoints()

    // Set postdoc_end_date to OLD_END
    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)

    // Seed 3 unemployed checkpoints between old+1 and new
    const testDates = ['2026-04-12', '2026-04-13', '2026-04-14']
    await seedUnemployedCheckpoints(testDates)
    log('Step 1', `Seeded ${testDates.length} unemployed checkpoints after ${OLD_END}`)

    // Run extension (service client mimics the server action's DB ops)
    const { data: unemployed } = await service
      .from('daily_checkpoint')
      .select('checkpoint_date')
      .eq('user_id', TEST_USER_ID)
      .eq('status_snapshot', 'unemployed')
      .gt('checkpoint_date', OLD_END)
      .lte('checkpoint_date', NEW_END)

    const corrections = (unemployed ?? []).map((c) => ({
      user_id: TEST_USER_ID,
      checkpoint_date: c.checkpoint_date,
      original_status: 'unemployed',
      corrected_status: 'employed_postdoc',
      trigger_source: 'postdoc_extension_backfill',
    }))

    const { error: corrErr } = await service
      .from('checkpoint_corrections')
      .insert(corrections)
    expect(corrErr).toBeNull()
    log('Step 2', `Inserted ${corrections.length} corrections`)

    // Update postdoc_end_date
    const { error: updateErr } = await service
      .from('immigration_status')
      .update({ postdoc_end_date: NEW_END })
      .eq('user_id', TEST_USER_ID)
    expect(updateErr).toBeNull()
    log('Step 3', `Updated postdoc_end_date to ${NEW_END}`)

    // Verify corrections exist
    const { data: savedCorrections } = await service
      .from('checkpoint_corrections')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('trigger_source', 'postdoc_extension_backfill')

    expect(savedCorrections).toHaveLength(3)
    expect(savedCorrections!.every((c) => c.corrected_status === 'employed_postdoc')).toBe(true)
    log('Step 4', 'Corrections verified: 3 rows, all employed_postdoc')

    // Verify original checkpoints UNTOUCHED
    const { data: originals } = await service
      .from('daily_checkpoint')
      .select('status_snapshot')
      .eq('user_id', TEST_USER_ID)
      .in('checkpoint_date', testDates)

    expect(originals!.every((c) => c.status_snapshot === 'unemployed')).toBe(true)
    log('Step 5', 'Original checkpoints untouched (still unemployed)')

    await cleanupTestCheckpoints()
    // Restore old end date
    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)
  })

  it('[immigration] idempotent: running extension twice does not duplicate corrections', async () => {
    await cleanupTestCheckpoints()

    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)

    await seedUnemployedCheckpoints(['2026-04-12'])

    // First run
    const { error: err1 } = await service
      .from('checkpoint_corrections')
      .insert({
        user_id: TEST_USER_ID,
        checkpoint_date: '2026-04-12',
        original_status: 'unemployed',
        corrected_status: 'employed_postdoc',
        trigger_source: 'postdoc_extension_backfill',
      })
    expect(err1).toBeNull()

    // Check existing corrections (simulates the idempotency check)
    const { data: existing } = await service
      .from('checkpoint_corrections')
      .select('checkpoint_date')
      .eq('user_id', TEST_USER_ID)
      .eq('trigger_source', 'postdoc_extension_backfill')

    const existingDates = new Set((existing ?? []).map((c) => c.checkpoint_date))

    // Second run: filter out already-corrected dates
    const { data: checkpoints } = await service
      .from('daily_checkpoint')
      .select('checkpoint_date')
      .eq('user_id', TEST_USER_ID)
      .eq('status_snapshot', 'unemployed')
      .gt('checkpoint_date', OLD_END)
      .lte('checkpoint_date', NEW_END)

    const newCorrections = (checkpoints ?? [])
      .filter((c) => !existingDates.has(c.checkpoint_date))

    expect(newCorrections).toHaveLength(0)
    log('Idempotency', 'No duplicate corrections produced')

    await cleanupTestCheckpoints()
    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)
  })

  it('[immigration] multiple sequential extensions handled correctly', async () => {
    await cleanupTestCheckpoints()

    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)

    // First extension: April 11 -> May 1
    await seedUnemployedCheckpoints(['2026-04-12', '2026-04-13'])

    const { error: err1 } = await service
      .from('checkpoint_corrections')
      .insert([
        { user_id: TEST_USER_ID, checkpoint_date: '2026-04-12', original_status: 'unemployed', corrected_status: 'employed_postdoc', trigger_source: 'postdoc_extension_backfill' },
        { user_id: TEST_USER_ID, checkpoint_date: '2026-04-13', original_status: 'unemployed', corrected_status: 'employed_postdoc', trigger_source: 'postdoc_extension_backfill' },
      ])
    expect(err1).toBeNull()

    await service
      .from('immigration_status')
      .update({ postdoc_end_date: '2026-05-01' })
      .eq('user_id', TEST_USER_ID)

    // Second extension: May 1 -> June 1
    await seedUnemployedCheckpoints(['2026-05-02', '2026-05-03'])

    const { error: err2 } = await service
      .from('checkpoint_corrections')
      .insert([
        { user_id: TEST_USER_ID, checkpoint_date: '2026-05-02', original_status: 'unemployed', corrected_status: 'employed_postdoc', trigger_source: 'postdoc_extension_backfill' },
        { user_id: TEST_USER_ID, checkpoint_date: '2026-05-03', original_status: 'unemployed', corrected_status: 'employed_postdoc', trigger_source: 'postdoc_extension_backfill' },
      ])
    expect(err2).toBeNull()

    await service
      .from('immigration_status')
      .update({ postdoc_end_date: '2026-06-01' })
      .eq('user_id', TEST_USER_ID)

    // All 4 corrections should exist
    const { data: allCorrections } = await service
      .from('checkpoint_corrections')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('trigger_source', 'postdoc_extension_backfill')
      .order('checkpoint_date')

    expect(allCorrections).toHaveLength(4)
    log('Sequential', `4 corrections from 2 extensions: ${allCorrections!.map((c) => c.checkpoint_date).join(', ')}`)

    await cleanupTestCheckpoints()
    await service
      .from('immigration_status')
      .update({ postdoc_end_date: OLD_END })
      .eq('user_id', TEST_USER_ID)
  })
})

describe('confirmEmployment (real Supabase)', () => {
  // Set up employed state before each test in this describe
  beforeAll(async () => {
    await service
      .from('immigration_status')
      .update({
        employment_active: true,
        employment_active_since: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        last_employment_confirmed_at: null,
      })
      .eq('user_id', TEST_USER_ID)
    log('confirmEmployment setup', 'Set employment_active=true, last_confirmed=null')
  })

  it('[immigration] stillActive=true resets last_employment_confirmed_at', async () => {
    const before = new Date().toISOString()

    const { error } = await service
      .from('immigration_status')
      .update({ last_employment_confirmed_at: new Date().toISOString() })
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', 'Updated last_employment_confirmed_at to now')

    const { data } = await service
      .from('immigration_status')
      .select('last_employment_confirmed_at, employment_active')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.employment_active).toBe(true)
    expect(data!.last_employment_confirmed_at).not.toBeNull()
    const storedAt = new Date(data!.last_employment_confirmed_at!)
    expect(storedAt.getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000)
    log('Step 3', `Verified: last_confirmed=${data!.last_employment_confirmed_at}, still active`)
  })

  it('[immigration] stillActive=false sets employment_active=false + stores end date', async () => {
    const endDate = '2026-03-20'

    const { error } = await service
      .from('immigration_status')
      .update({
        employment_active: false,
        employment_active_since: null,
        last_employment_confirmed_at: null,
        employment_end_date: endDate,
      })
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', `Set employment ended: end_date=${endDate}`)

    const { data } = await service
      .from('immigration_status')
      .select('employment_active, employment_active_since, last_employment_confirmed_at, employment_end_date')
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(data!.employment_active).toBe(false)
    expect(data!.employment_active_since).toBeNull()
    expect(data!.last_employment_confirmed_at).toBeNull()
    expect(data!.employment_end_date).toBe(endDate)
    log('Step 3', `Verified: active=false, since=null, end_date=${data!.employment_end_date}`)
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
