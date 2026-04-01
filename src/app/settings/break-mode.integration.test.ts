/**
 * Integration tests for break mode — real Supabase.
 * Tests the break_mode_until column on users table.
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
import { shouldSuppressForBreakMode } from '@/lib/email-alerts'

function log(step: string, detail: string) {
  process.stdout.write(`  [break-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()

beforeAll(async () => {
  await assertSupabaseReachable()
  // Clear any existing break mode
  await service.from('users').update({ break_mode_until: null }).eq('id', TEST_USER_ID)
  log('Setup', 'Break mode cleared')
})

afterAll(async () => {
  // Clean up
  await service.from('users').update({ break_mode_until: null }).eq('id', TEST_USER_ID)
  log('Cleanup', 'Break mode cleared')
})

describe('break mode (real Supabase)', () => {
  it('[break-integration] Step 1: activates break mode by setting break_mode_until', async () => {
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await service
      .from('users')
      .update({ break_mode_until: until })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', `Set break_mode_until to ${until}`)

    // Verify it was written
    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    expect(data?.break_mode_until).toBeTruthy()
    const storedDate = new Date(data!.break_mode_until)
    expect(storedDate.getTime()).toBeGreaterThan(Date.now())
    log('Step 3', `Verified: break_mode_until=${data!.break_mode_until}`)
  })

  it('[break-integration] Step 1: deactivates break mode by setting null', async () => {
    // First activate
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    await service.from('users').update({ break_mode_until: until }).eq('id', TEST_USER_ID)
    log('Step 2', 'Break activated')

    // Deactivate
    const { error } = await service
      .from('users')
      .update({ break_mode_until: null })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 3', 'Break deactivated')

    // Verify
    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    expect(data?.break_mode_until).toBeNull()
    log('Step 4', 'Verified: break_mode_until is null')
  })

  it('[break-integration] Step 1: shouldSuppressForBreakMode with real break_mode_until', async () => {
    const futureBreak = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    await service.from('users').update({ break_mode_until: futureBreak }).eq('id', TEST_USER_ID)
    log('Step 2', 'Break activated, testing suppression logic')

    // Read back the value
    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    const breakUntil = data!.break_mode_until

    // Unemployment digest: suppressed when >15 days remaining
    expect(shouldSuppressForBreakMode(breakUntil, 'unemployment_digest', 20)).toBe(true)
    log('Step 3', 'unemployment_digest suppressed at 20 days (correct)')

    // Unemployment digest: NOT suppressed when <=15 days (critical)
    expect(shouldSuppressForBreakMode(breakUntil, 'unemployment_digest', 15)).toBe(false)
    log('Step 4', 'unemployment_digest NOT suppressed at 15 days (critical override)')

    // Deadline alerts: NEVER suppressed
    expect(shouldSuppressForBreakMode(breakUntil, 'deadline_72h')).toBe(false)
    log('Step 5', 'deadline_72h NOT suppressed (always bypasses)')

    // Cron failure: NEVER suppressed
    expect(shouldSuppressForBreakMode(breakUntil, 'cron_failure')).toBe(false)
    log('Step 6', 'cron_failure NOT suppressed (developer alert)')

    // Clean up
    await service.from('users').update({ break_mode_until: null }).eq('id', TEST_USER_ID)
  })

  it('[break-integration] Step 1: expired break mode does not suppress', async () => {
    const pastBreak = '2020-01-01T00:00:00Z'
    await service.from('users').update({ break_mode_until: pastBreak }).eq('id', TEST_USER_ID)
    log('Step 2', 'Set expired break mode')

    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    expect(shouldSuppressForBreakMode(data!.break_mode_until, 'unemployment_digest', 20)).toBe(false)
    log('Step 3', 'Expired break mode does NOT suppress (correct)')

    await service.from('users').update({ break_mode_until: null }).eq('id', TEST_USER_ID)
  })
})
