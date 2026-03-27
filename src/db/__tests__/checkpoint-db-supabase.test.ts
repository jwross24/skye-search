/**
 * Integration tests for CheckpointDbSupabase.
 * Runs against local Supabase (supabase start must be running).
 * Uses the test user seeded by src/db/seed-to-supabase.ts.
 */
import { config } from 'dotenv'
import path from 'path'

// Load .env.local for Supabase connection (not loaded by Vitest by default)
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createCheckpointDbSupabase } from '../checkpoint-db-supabase'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
// Use a random year in the far future so concurrent test sessions don't collide
// on the unique(user_id, checkpoint_date) constraint
const TEST_YEAR = 2200 + Math.floor(Math.random() * 800) // 2200-2999
const TEST_DATE = `${TEST_YEAR}-12-31`

let adminClient: SupabaseClient
let db: ReturnType<typeof createCheckpointDbSupabase>

beforeAll(() => {
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
  db = createCheckpointDbSupabase()
})

// Clean up test data after each test
afterEach(async () => {
  await adminClient
    .from('daily_checkpoint')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .gte('checkpoint_date', `${TEST_YEAR}-01-01`)

  await adminClient
    .from('cron_execution_log')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .gte('execution_date', `${TEST_YEAR}-01-01`)
})

afterAll(async () => {
  // Final cleanup
  await adminClient
    .from('daily_checkpoint')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .gte('checkpoint_date', `${TEST_YEAR}-01-01`)

  await adminClient
    .from('cron_execution_log')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .gte('execution_date', `${TEST_YEAR}-01-01`)
})

// ─── Query Methods ───────────────────────────────────────────────────────────

describe('getImmigrationStatus', () => {
  it('returns immigration status for existing user', async () => {
    const result = await db.getImmigrationStatus(TEST_USER_ID)

    expect(result).not.toBeNull()
    expect(result!.user_id).toBe(TEST_USER_ID)
    expect(result!.employment_active).toBe(true)
    expect(result!.initial_days_used).toBe(31)
    expect(result!.postdoc_end_date).toBe('2026-04-11')
    expect(result!.opt_expiry).toBe('2026-08-15')
    expect(result!.calibration_date).toBe('2026-03-24')
  })

  it('returns null for nonexistent user', async () => {
    const result = await db.getImmigrationStatus('00000000-0000-0000-0000-000000000099')
    expect(result).toBeNull()
  })
})

describe('getAllUserIds', () => {
  it('returns array including the test user', async () => {
    const result = await db.getAllUserIds()

    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain(TEST_USER_ID)
  })
})

describe('checkpointExists', () => {
  it('returns false when no checkpoint exists', async () => {
    const result = await db.checkpointExists(TEST_USER_ID, TEST_DATE)
    expect(result).toBe(false)
  })

  it('returns true after inserting a checkpoint', async () => {
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: TEST_DATE,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: 'integration test',
    })

    const result = await db.checkpointExists(TEST_USER_ID, TEST_DATE)
    expect(result).toBe(true)
  })
})

describe('getLastCheckpoint', () => {
  it('returns null when no prior checkpoints exist', async () => {
    const result = await db.getLastCheckpoint(TEST_USER_ID, `${TEST_YEAR}-01-01`)
    expect(result).toBeNull()
  })

  it('returns the most recent checkpoint before the target date', async () => {
    // Insert two checkpoints
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-01`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-02`,
      status_snapshot: 'employed_bridge',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })

    const result = await db.getLastCheckpoint(TEST_USER_ID, `${TEST_YEAR}-06-03`)
    expect(result).not.toBeNull()
    expect(result!.checkpoint_date).toBe(`${TEST_YEAR}-06-02`)
    expect(result!.status_snapshot).toBe('employed_bridge')

    // Requesting before first checkpoint returns null
    const result2 = await db.getLastCheckpoint(TEST_USER_ID, `${TEST_YEAR}-06-01`)
    expect(result2).toBeNull()
  })
})

describe('countUnemployedCheckpoints', () => {
  it('returns 0 when no unemployed checkpoints exist', async () => {
    const result = await db.countUnemployedCheckpoints(TEST_USER_ID, TEST_DATE)
    expect(result).toBe(0)
  })

  it('counts only unemployed checkpoints before the target date', async () => {
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-01`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-02`,
      status_snapshot: 'employed_bridge',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-03`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 33,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })

    const count = await db.countUnemployedCheckpoints(TEST_USER_ID, `${TEST_YEAR}-06-04`)
    expect(count).toBe(2) // Two unemployed days (06-01 and 06-03)

    const countBefore = await db.countUnemployedCheckpoints(TEST_USER_ID, `${TEST_YEAR}-06-02`)
    expect(countBefore).toBe(1) // Only 06-01
  })
})

describe('getExistingCheckpointDates', () => {
  it('returns empty Set when no checkpoints in range', async () => {
    const result = await db.getExistingCheckpointDates(TEST_USER_ID, `${TEST_YEAR}-01-01`, `${TEST_YEAR}-01-31`)
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns Set of checkpoint dates in range (exclusive boundaries)', async () => {
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-01`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-02`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 33,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: `${TEST_YEAR}-06-04`,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 34,
      trigger_source: 'manual_backfill',
      evidence_notes: null,
    })

    const result = await db.getExistingCheckpointDates(TEST_USER_ID, `${TEST_YEAR}-05-31`, `${TEST_YEAR}-06-05`)
    expect(result.size).toBe(3)
    expect(result.has(`${TEST_YEAR}-06-01`)).toBe(true)
    expect(result.has(`${TEST_YEAR}-06-02`)).toBe(true)
    expect(result.has(`${TEST_YEAR}-06-03`)).toBe(false) // Gap
    expect(result.has(`${TEST_YEAR}-06-04`)).toBe(true)
  })
})

describe('getActiveOffer', () => {
  it('returns null when no offer_accepted applications exist', async () => {
    const result = await db.getActiveOffer(TEST_USER_ID, TEST_DATE)
    expect(result).toBeNull()
  })
})

// ─── Write Methods ───────────────────────────────────────────────────────────

describe('insertCheckpoint', () => {
  it('inserts a checkpoint and it becomes queryable', async () => {
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: TEST_DATE,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'keepalive_gha',
      evidence_notes: 'integration test insert',
    })

    const exists = await db.checkpointExists(TEST_USER_ID, TEST_DATE)
    expect(exists).toBe(true)

    const last = await db.getLastCheckpoint(TEST_USER_ID, `${TEST_YEAR + 1}-01-01`)
    expect(last).not.toBeNull()
    expect(last!.checkpoint_date).toBe(TEST_DATE)
    expect(last!.evidence_notes).toBe('integration test insert')
  })

  it('throws on duplicate checkpoint (unique constraint)', async () => {
    await db.insertCheckpoint({
      user_id: TEST_USER_ID,
      checkpoint_date: TEST_DATE,
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'keepalive_gha',
      evidence_notes: null,
    })

    await expect(
      db.insertCheckpoint({
        user_id: TEST_USER_ID,
        checkpoint_date: TEST_DATE,
        status_snapshot: 'employed_bridge',
        unemployment_days_used_cumulative: 32,
        trigger_source: 'keepalive_gha',
        evidence_notes: null,
      }),
    ).rejects.toThrow('insertCheckpoint failed')
  })
})

describe('insertCronLog + updateCronLog', () => {
  it('inserts a cron log and returns its ID', async () => {
    const logId = await db.insertCronLog({
      user_id: TEST_USER_ID,
      execution_date: TEST_DATE,
      status: 'started',
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      unemployment_days_used_before: null,
      unemployment_days_used_after: null,
      employment_active_at_check: null,
      trigger_source: 'keepalive_gha',
    })

    expect(typeof logId).toBe('string')
    expect(logId.length).toBeGreaterThan(0)
  })

  it('updates a cron log with completion data', async () => {
    const logId = await db.insertCronLog({
      user_id: TEST_USER_ID,
      execution_date: TEST_DATE,
      status: 'started',
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      unemployment_days_used_before: null,
      unemployment_days_used_after: null,
      employment_active_at_check: null,
      trigger_source: 'keepalive_gha',
    })

    await db.updateCronLog(logId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      unemployment_days_used_before: 31,
      unemployment_days_used_after: 32,
      employment_active_at_check: false,
    })

    // Verify the update persisted
    const { data } = await adminClient
      .from('cron_execution_log')
      .select('status, unemployment_days_used_before, unemployment_days_used_after')
      .eq('id', logId)
      .single()

    expect(data!.status).toBe('completed')
    expect(data!.unemployment_days_used_before).toBe(31)
    expect(data!.unemployment_days_used_after).toBe(32)
  })
})

describe('refreshLedger', () => {
  it('does not throw (silently succeeds or skips if RPC missing)', async () => {
    await expect(db.refreshLedger()).resolves.not.toThrow()
  })
})

// ─── End-to-End: Full Checkpoint Flow ────────────────────────────────────────

describe('full checkpoint flow (integration)', () => {
  it('runDailyCheckpoint creates checkpoint via real Supabase', async () => {
    const { runDailyCheckpoint } = await import('../unemployment-cron')

    const results = await runDailyCheckpoint(db, {
      userId: TEST_USER_ID,
      targetDate: TEST_DATE,
      triggerSource: 'manual_backfill',
    })

    expect(results).toHaveLength(1)
    const result = results[0]

    expect(result.action).toBe('checkpoint_created')
    expect(result.userId).toBe(TEST_USER_ID)
    expect(result.targetDate).toBe(TEST_DATE)
    // Far future date with employment_active=true → employed_bridge
    // (manual toggle takes priority over OPT expiry check)
    expect(result.statusSnapshot).toBe('employed_bridge')
    expect(typeof result.cumulative).toBe('number')

    // Verify checkpoint persisted in DB
    const exists = await db.checkpointExists(TEST_USER_ID, TEST_DATE)
    expect(exists).toBe(true)
  })

  it('runDailyCheckpoint is idempotent (skips on second run)', async () => {
    const { runDailyCheckpoint } = await import('../unemployment-cron')

    // First run
    await runDailyCheckpoint(db, {
      userId: TEST_USER_ID,
      targetDate: TEST_DATE,
      triggerSource: 'manual_backfill',
    })

    // Second run — should skip
    const results = await runDailyCheckpoint(db, {
      userId: TEST_USER_ID,
      targetDate: TEST_DATE,
      triggerSource: 'manual_backfill',
    })

    expect(results[0].action).toBe('skip_idempotent')
  })
})
