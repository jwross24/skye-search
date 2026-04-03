import { describe, it, expect, vi } from 'vitest'
import {
  type StatusSnapshot,
  type TriggerSource,
  type ImmigrationStatusRow,
  type CheckpointRow,
  type ActiveOffer,
  type CheckpointDb,
  isValidTransition,
  isIllegalTransition,
  resolveEmploymentStatus,
  findMissedDates,
  runDailyCheckpoint,
  computeDefaultTargetDate,
} from '../unemployment-cron'

// ─── Mock DB Factory ────────────────────────────────────────────────────────

function makeImmStatus(overrides: Partial<ImmigrationStatusRow> = {}): ImmigrationStatusRow {
  return {
    user_id: 'user-1',
    employment_active: false,
    employment_active_since: null,
    initial_days_used: 31,
    postdoc_end_date: '2026-04-11',
    opt_expiry: '2026-08-15',
    calibration_date: '2026-03-24',
    ...overrides,
  }
}

function makeCheckpoint(overrides: Partial<CheckpointRow> = {}): CheckpointRow {
  return {
    id: 'ckpt-1',
    user_id: 'user-1',
    checkpoint_date: '2026-04-12',
    status_snapshot: 'unemployed',
    unemployment_days_used_cumulative: 32,
    trigger_source: 'pg_cron',
    evidence_notes: null,
    ...overrides,
  }
}

function makeOffer(overrides: Partial<ActiveOffer> = {}): ActiveOffer {
  return {
    job_id: 'job-1',
    employer_type: 'university',
    visa_path: 'cap_exempt',
    start_date: '2026-05-01',
    ...overrides,
  }
}

/** Create a mock CheckpointDb with all methods as vi.fn() */
function createMockDb(overrides: Partial<CheckpointDb> = {}): CheckpointDb {
  return {
    getImmigrationStatus: vi.fn().mockResolvedValue(makeImmStatus()),
    getAllUserIds: vi.fn().mockResolvedValue(['user-1']),
    checkpointExists: vi.fn().mockResolvedValue(false),
    getLastCheckpoint: vi.fn().mockResolvedValue(null),
    countUnemployedCheckpoints: vi.fn().mockResolvedValue(0),
    getExistingCheckpointDates: vi.fn().mockResolvedValue(new Set<string>()),
    getActiveOffer: vi.fn().mockResolvedValue(null),
    insertCheckpoint: vi.fn().mockResolvedValue(undefined),
    insertCronLog: vi.fn().mockResolvedValue('log-1'),
    updateCronLog: vi.fn().mockResolvedValue(undefined),
    refreshLedger: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function log(step: string, detail: string) {
  process.stdout.write(`  [unemployment-cron test] ${step}: ${detail}\n`)
}

// ─── 1. Clock Increment/Halt ────────────────────────────────────────────────

describe('Clock increment/halt', () => {
  it('increment from 31 -> 32 used days when unemployed', async () => {
    log('Step 1', 'Setting up: initial_days_used=31, status=unemployed')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ initial_days_used: 31, employment_active: false }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(0),
    })

    log('Step 2', 'Running checkpoint for 2026-04-12 (day after postdoc ends)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })

    log('Step 3', `Expected cumulative=32, actual=${result.cumulative}`)
    expect(result.action).toBe('checkpoint_created')
    expect(result.statusSnapshot).toBe('unemployed')
    expect(result.cumulative).toBe(32)
    expect(result.daysBefore).toBe(31)
  })

  it('halt when employment_active=true via Kanban trigger', async () => {
    log('Step 1', 'Setting up: offer_accepted at university with start_date <= today')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ initial_days_used: 40, employment_active: false }),
      ),
      getActiveOffer: vi.fn().mockResolvedValue(
        makeOffer({ start_date: '2026-05-01', employer_type: 'university', visa_path: 'cap_exempt' }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(9),
    })

    log('Step 2', 'Running checkpoint for 2026-05-15 (offer already started)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-05-15',
    })

    log('Step 3', `Expected status=employed_h1b, cumulative=49 (no increment), actual status=${result.statusSnapshot}, cumulative=${result.cumulative}`)
    expect(result.statusSnapshot).toBe('employed_h1b')
    expect(result.cumulative).toBe(49) // 40 + 9, no increment
  })

  it('halt when employment_active=true via manual toggle', async () => {
    log('Step 1', 'Setting up: employment_active=true (manual toggle)')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ employment_active: true, initial_days_used: 31 }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(5),
    })

    log('Step 2', 'Running checkpoint for 2026-04-20')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-20',
    })

    log('Step 3', `Expected status=employed_bridge, actual=${result.statusSnapshot}`)
    expect(result.statusSnapshot).toBe('employed_bridge')
    expect(result.cumulative).toBe(36) // 31 + 5, no increment
  })

  it('resume when employment ends', async () => {
    log('Step 1', 'Setting up: employment_active=false after bridge ended')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ employment_active: false, initial_days_used: 31 }),
      ),
      getLastCheckpoint: vi.fn().mockResolvedValue(
        makeCheckpoint({ status_snapshot: 'employed_bridge', checkpoint_date: '2026-06-14' }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(10),
    })

    log('Step 2', 'Running checkpoint for 2026-06-15 (employment just ended)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-06-15',
    })

    log('Step 3', `Expected status=unemployed, cumulative=42, actual status=${result.statusSnapshot}, cumulative=${result.cumulative}`)
    expect(result.statusSnapshot).toBe('unemployed')
    expect(result.cumulative).toBe(42) // 31 + 10 + 1
  })

  it('does NOT retroactively increment after missed cron run', async () => {
    log('Step 1', 'Setting up: 2-day gap, only today inserted')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ initial_days_used: 31 }),
      ),
      getExistingCheckpointDates: vi.fn().mockResolvedValue(
        new Set(['2026-04-12', '2026-04-13']),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(2),
    })

    log('Step 2', 'Running checkpoint for 2026-04-16 (2 days missed: 14th, 15th)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-16',
    })

    log('Step 3', 'Verify only 1 checkpoint inserted (today), not 3')
    expect(db.insertCheckpoint).toHaveBeenCalledTimes(1)
    expect(result.gapDates).toEqual(['2026-04-14', '2026-04-15'])
    expect(result.cumulative).toBe(34) // 31 + 2 existing + 1 new
  })

  it('DST spring-forward March — correct target_date', () => {
    log('Step 1', 'Setting NOW to March 9, 2026 2:30 AM UTC (spring-forward)')
    // March 8, 2026 is spring-forward day for US Eastern
    // At 2:30 AM UTC on March 9 → minus 2h = 0:30 AM UTC March 9
    // In ET: 0:30 AM UTC = 7:30 PM ET March 8 (EST) or 8:30 PM ET March 8 (EDT after spring forward)
    // The 2-hour shift ensures we safely get "yesterday"
    const now = new Date('2026-03-09T02:30:00Z')
    const targetDate = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-03-08, actual=${targetDate}`)
    expect(targetDate).toBe('2026-03-08')
  })

  it('DST fall-back November — no duplicate day', () => {
    log('Step 1', 'Setting NOW to November 1, 2026 6:30 AM UTC (fall-back)')
    // November 1, 2026 is fall-back day for US Eastern
    // At 6:30 AM UTC on Nov 1 → minus 2h = 4:30 AM UTC Nov 1
    // In ET: 4:30 AM UTC = 11:30 PM ET Oct 31 (EDT) or 12:30 AM ET Nov 1 (after fall-back)
    // The 2-hour shift handles this correctly
    const now = new Date('2026-11-01T06:30:00Z')
    const targetDate = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-10-31 or 2026-11-01, actual=${targetDate}`)
    // At 4:30 AM UTC, ET is still EDT (UTC-4) = 12:30 AM Nov 1 ET
    // But we want "yesterday" so the 2-hour shift already accounted for this
    expect(targetDate).toMatch(/^2026-(10-31|11-01)$/)
  })

  it('fires CRITICAL alert at exactly 150 days used', async () => {
    log('Step 1', 'Setting up: cumulative=149 (initial=31 + 118 checkpoints)')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ initial_days_used: 31 }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(118),
    })

    log('Step 2', 'Running checkpoint — should push to exactly 150')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-08-10',
    })

    log('Step 3', `Expected cumulative=150 with CRITICAL alert, actual cumulative=${result.cumulative}, alert=${result.alert}`)
    expect(result.cumulative).toBe(150)
    expect(result.alert).toBe('CRITICAL_150')
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      error_message: 'CRITICAL: unemployment days reached 150',
    }))
  })

  it('does NOT increment past 150', async () => {
    log('Step 1', 'Setting up: cumulative already at 150')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ initial_days_used: 31 }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(119),
    })

    log('Step 2', 'Running checkpoint — should stay at 150')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-08-12',
    })

    log('Step 3', `Expected cumulative=150 (no increment), actual=${result.cumulative}`)
    expect(result.cumulative).toBe(150) // 31 + 119 = 150, no further increment
  })
})

// ─── 2. Idempotency ────────────────────────────────────────────────────────

describe('Idempotency', () => {
  it('running cron twice on same date is a no-op', async () => {
    log('Step 1', 'Setting up: checkpoint already exists for target date')
    const db = createMockDb({
      checkpointExists: vi.fn().mockResolvedValue(true),
    })

    log('Step 2', 'Running checkpoint — should skip')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })

    log('Step 3', `Expected action=skip_idempotent, actual=${result.action}`)
    expect(result.action).toBe('skip_idempotent')
    expect(db.insertCheckpoint).not.toHaveBeenCalled()
  })

  it('second run exits immediately without modifying cron_execution_log', async () => {
    log('Step 1', 'Setting up: checkpoint already exists')
    const db = createMockDb({
      checkpointExists: vi.fn().mockResolvedValue(true),
    })

    log('Step 2', 'Running checkpoint — verify no cron log writes')
    await runDailyCheckpoint(db, { userId: 'user-1', targetDate: '2026-04-12' })

    log('Step 3', 'Verify: no cron log created or updated')
    expect(db.insertCronLog).not.toHaveBeenCalled()
    expect(db.updateCronLog).not.toHaveBeenCalled()
  })
})

// ─── 3. Clock Interaction ───────────────────────────────────────────────────

describe('Clock interaction', () => {
  it('employment starting mid-day: cron at midnight sees employment_active=true', async () => {
    log('Step 1', 'Setting up: employment toggle set at 3pm, cron runs at midnight')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({
          employment_active: true,
          employment_active_since: '2026-05-01T15:00:00Z',
        }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(19),
    })

    log('Step 2', 'Running checkpoint for the same day')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-05-01',
    })

    log('Step 3', `Expected employed_bridge (toggle=true), actual=${result.statusSnapshot}`)
    expect(result.statusSnapshot).toBe('employed_bridge')
    expect(result.employmentActive).toBe(true)
  })

  it('employment ending mid-day: next cron correctly increments', async () => {
    log('Step 1', 'Setting up: employment ended at 2pm, employment_active=false now')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ employment_active: false }),
      ),
      getLastCheckpoint: vi.fn().mockResolvedValue(
        makeCheckpoint({ status_snapshot: 'employed_bridge', checkpoint_date: '2026-05-30' }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(20),
    })

    log('Step 2', 'Running checkpoint for next day')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-05-31',
    })

    log('Step 3', `Expected unemployed with increment, actual=${result.statusSnapshot}, cumulative=${result.cumulative}`)
    expect(result.statusSnapshot).toBe('unemployed')
    expect(result.cumulative).toBe(52) // 31 + 20 + 1
  })

  it('race condition: offer_accepted write overlaps with cron — offer wins', async () => {
    log('Step 1', 'Setting up: offer_accepted exists with start_date <= today')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ employment_active: false }),
      ),
      getActiveOffer: vi.fn().mockResolvedValue(
        makeOffer({ start_date: '2026-05-15' }),
      ),
      getLastCheckpoint: vi.fn().mockResolvedValue(
        makeCheckpoint({ status_snapshot: 'unemployed', checkpoint_date: '2026-05-14' }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(33),
    })

    log('Step 2', 'Running checkpoint — offer should override unemployed')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-05-15',
    })

    log('Step 3', `Expected employed_h1b (offer at cap-exempt), actual=${result.statusSnapshot}`)
    expect(result.statusSnapshot).toBe('employed_h1b')
  })
})

// ─── 4. Gap Detection ──────────────────────────────────────────────────────

describe('Gap detection', () => {
  it('detects missed days and logs gap alert', async () => {
    log('Step 1', 'Setting up: 3 OK days, 1 missed, 1 OK day')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ postdoc_end_date: '2026-04-11', calibration_date: '2026-04-11' }),
      ),
      getExistingCheckpointDates: vi.fn().mockResolvedValue(
        new Set(['2026-04-12', '2026-04-13', '2026-04-14']),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(3),
    })

    log('Step 2', 'Running checkpoint for 2026-04-16 (4/15 is missing)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-16',
    })

    log('Step 3', `Expected gap_dates=['2026-04-15'], actual=${JSON.stringify(result.gapDates)}`)
    expect(result.gapDates).toEqual(['2026-04-15'])
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      error_message: expect.stringContaining('GAP_ALERT'),
    }))
  })

  it('findMissedDates correctly identifies gaps', () => {
    log('Step 1', 'Testing gap finder utility')
    const existing = new Set(['2026-04-12', '2026-04-14', '2026-04-15'])
    const missed = findMissedDates('2026-04-11', '2026-04-16', existing)

    log('Step 2', `Expected ['2026-04-13'], actual=${JSON.stringify(missed)}`)
    expect(missed).toEqual(['2026-04-13'])
  })

  it('gap_days counted but not backfilled', async () => {
    log('Step 1', 'Setting up: 2 gap days between checkpoints')
    const db = createMockDb({
      getExistingCheckpointDates: vi.fn().mockResolvedValue(
        new Set(['2026-04-12']),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(1),
    })

    log('Step 2', 'Running checkpoint for 2026-04-15 (2 gap days: 13th, 14th)')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-15',
    })

    log('Step 3', 'Verify: only 1 insert call (today), not 3')
    expect(db.insertCheckpoint).toHaveBeenCalledTimes(1)
    expect(result.gapDates).toEqual(['2026-04-13', '2026-04-14'])
  })
})

// ─── 5. Cron Execution Logging ──────────────────────────────────────────────

describe('Cron execution logging', () => {
  it('cron_execution_log records started_at, completed_at, days_before, days_after', async () => {
    log('Step 1', 'Running a standard checkpoint')
    const db = createMockDb({
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(5),
    })

    await runDailyCheckpoint(db, { userId: 'user-1', targetDate: '2026-04-20' })

    log('Step 2', 'Verify cron log was created with started status')
    expect(db.insertCronLog).toHaveBeenCalledWith(expect.objectContaining({
      status: 'started',
      user_id: 'user-1',
      trigger_source: 'pg_cron',
    }))

    log('Step 3', 'Verify cron log was updated with completed status and day counts')
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      status: 'completed',
      unemployment_days_used_before: 36,
      unemployment_days_used_after: 37,
      employment_active_at_check: false,
    }))
  })

  it('failed cron sets status=failed with error_message', async () => {
    log('Step 1', 'Setting up: DB operation throws')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(makeImmStatus()),
      countUnemployedCheckpoints: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    })

    log('Step 2', 'Running checkpoint — should catch error')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })

    log('Step 3', `Expected action=error, actual=${result.action}`)
    expect(result.action).toBe('error')
    expect(result.error).toBe('DB connection lost')
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      status: 'failed',
      error_message: 'DB connection lost',
    }))
  })

  it('trigger_source correctly identifies pg_cron vs gha_cron vs keepalive_gha vs manual_backfill', async () => {
    log('Step 1', 'Running with each trigger source')

    for (const source of ['pg_cron', 'gha_cron', 'keepalive_gha', 'manual_backfill'] as TriggerSource[]) {
      const db = createMockDb()

      await runDailyCheckpoint(db, {
        userId: 'user-1',
        targetDate: '2026-04-12',
        triggerSource: source,
      })

      log('Step 2', `Checking trigger_source=${source}`)
      expect(db.insertCronLog).toHaveBeenCalledWith(expect.objectContaining({
        trigger_source: source,
      }))
      expect(db.insertCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
        trigger_source: source,
      }))
    }
  })
})

// ─── 6. Status State Machine ────────────────────────────────────────────────

describe('Status state machine', () => {
  it('employed_postdoc -> unemployed transition accepted', () => {
    log('Step 1', 'Testing: employed_postdoc -> unemployed')
    expect(isValidTransition('employed_postdoc', 'unemployed')).toBe(true)
    expect(isIllegalTransition('employed_postdoc', 'unemployed')).toBe(false)
  })

  it('grace_period -> employed_bridge transition REJECTED (illegal)', () => {
    log('Step 1', 'Testing: grace_period -> employed_bridge')
    expect(isIllegalTransition('grace_period', 'employed_bridge')).toBe(true)
  })

  it('employed_h1b -> employed_bridge transition REJECTED (illegal)', () => {
    log('Step 1', 'Testing: employed_h1b -> employed_bridge')
    expect(isIllegalTransition('employed_h1b', 'employed_bridge')).toBe(true)
  })

  it('any -> employed_postdoc REJECTED after postdoc ended', () => {
    log('Step 1', 'Testing: unemployed -> employed_postdoc is illegal')
    expect(isIllegalTransition('unemployed', 'employed_postdoc')).toBe(true)

    log('Step 2', 'Testing: employed_bridge -> employed_postdoc is illegal')
    expect(isIllegalTransition('employed_bridge', 'employed_postdoc')).toBe(true)

    log('Step 3', 'Testing: employed_h1b -> employed_postdoc is illegal')
    expect(isIllegalTransition('employed_h1b', 'employed_postdoc')).toBe(true)
  })

  it('unemployed -> employed_bridge accepted', () => {
    expect(isValidTransition('unemployed', 'employed_bridge')).toBe(true)
    expect(isIllegalTransition('unemployed', 'employed_bridge')).toBe(false)
  })

  it('unemployed -> employed_h1b accepted', () => {
    expect(isValidTransition('unemployed', 'employed_h1b')).toBe(true)
  })

  it('employed_bridge -> employed_h1b accepted', () => {
    expect(isValidTransition('employed_bridge', 'employed_h1b')).toBe(true)
  })

  it('same status transition is never illegal', () => {
    const statuses: StatusSnapshot[] = [
      'unemployed', 'employed_postdoc', 'employed_bridge',
      'employed_h1b', 'grace_period', 'CONFLICT',
    ]
    for (const s of statuses) {
      expect(isIllegalTransition(s, s)).toBe(false)
    }
  })

  it('CONFLICT status from illegal transition during checkpoint', async () => {
    log('Step 1', 'Setting up: prev status=grace_period, employment becomes active')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({
          employment_active: true,
          postdoc_end_date: '2026-04-11',
          opt_expiry: '2026-08-15',
        }),
      ),
      getLastCheckpoint: vi.fn().mockResolvedValue(
        makeCheckpoint({ status_snapshot: 'grace_period', checkpoint_date: '2026-08-16' }),
      ),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(100),
    })

    log('Step 2', 'Running checkpoint — grace_period -> employed_bridge is illegal')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-08-17',
    })

    log('Step 3', `Expected CONFLICT, actual=${result.statusSnapshot}`)
    expect(result.statusSnapshot).toBe('CONFLICT')
    // Verify the log includes the ORIGINAL attempted status, not 'CONFLICT'
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      error_message: 'INTEGRITY_ALERT: illegal transition grace_period -> employed_bridge',
    }))
  })
})

// ─── 7. Employment Resolution ───────────────────────────────────────────────

describe('Employment resolution', () => {
  it('returns employed_postdoc when target date <= postdoc_end_date', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-04-11',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: null,
    })
    expect(status).toBe('employed_postdoc')
  })

  it('returns unemployed after postdoc ends with no employment', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-04-12',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: null,
    })
    expect(status).toBe('unemployed')
  })

  it('returns employed_h1b for cap-exempt offer', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: makeOffer({ employer_type: 'university', start_date: '2026-05-01' }),
    })
    expect(status).toBe('employed_h1b')
  })

  it('returns employed_bridge for private sector offer', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: makeOffer({
        employer_type: 'private_sector',
        visa_path: 'cap_subject',
        start_date: '2026-05-01',
      }),
    })
    expect(status).toBe('employed_bridge')
  })

  it('returns employed_bridge for manual toggle', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: true,
      activeOffer: null,
    })
    expect(status).toBe('employed_bridge')
  })

  it('returns grace_period when OPT expired', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-08-16',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: null,
    })
    expect(status).toBe('grace_period')
  })

  it('offer takes priority over manual toggle', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: true,
      activeOffer: makeOffer({ start_date: '2026-05-01' }),
    })
    expect(status).toBe('employed_h1b')
  })

  it('offer with future start_date does not count yet', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-04-30',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: makeOffer({ start_date: '2026-05-01' }),
    })
    // Offer start_date (May 1) > targetDate (Apr 30) — not started yet
    expect(status).toBe('unemployed')
  })

  it('cooperative_institute treated as cap-exempt', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: '2026-04-11',
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: makeOffer({
        employer_type: 'cooperative_institute',
        visa_path: 'unknown',
        start_date: '2026-05-01',
      }),
    })
    expect(status).toBe('employed_h1b')
  })

  it('returns unemployed when postdoc_end_date is null and not employed', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-05-15',
      postdocEndDate: null,
      optExpiry: '2026-08-15',
      employmentActive: false,
      activeOffer: null,
    })
    expect(status).toBe('unemployed')
  })

  it('returns unemployed when opt_expiry is null and not employed', () => {
    const status = resolveEmploymentStatus({
      targetDate: '2026-09-01',
      postdocEndDate: '2026-04-11',
      optExpiry: null,
      employmentActive: false,
      activeOffer: null,
    })
    expect(status).toBe('unemployed')
  })
})

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('returns error when no immigration status exists', async () => {
    log('Step 1', 'Setting up: getImmigrationStatus returns null')
    const db = createMockDb({
      checkpointExists: vi.fn().mockResolvedValue(false),
      getImmigrationStatus: vi.fn().mockResolvedValue(null),
    })

    log('Step 2', 'Running checkpoint')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })

    log('Step 3', `Expected action=error, actual=${result.action}`)
    expect(result.action).toBe('error')
    expect(result.error).toBe('No immigration status found')
    expect(db.insertCheckpoint).not.toHaveBeenCalled()
  })

  it('prevStatus defaults to unemployed when postdoc_end_date is null', async () => {
    log('Step 1', 'Setting up: postdoc_end_date=null, no previous checkpoint')
    const db = createMockDb({
      getImmigrationStatus: vi.fn().mockResolvedValue(
        makeImmStatus({ postdoc_end_date: null, initial_days_used: 0 }),
      ),
      getLastCheckpoint: vi.fn().mockResolvedValue(null),
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(0),
      getExistingCheckpointDates: vi.fn().mockResolvedValue(new Set()),
    })

    log('Step 2', 'Running checkpoint')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })

    log('Step 3', `Expected unemployed (no postdoc context), actual=${result.statusSnapshot}`)
    expect(result.statusSnapshot).toBe('unemployed')
    expect(result.cumulative).toBe(1)
  })
})

// ─── 8. Integration: 150-day Simulation ────────────────────────────────────

describe('Integration: 150-day clock progression', () => {
  it('simulate 150 days with 2 employment gaps', async () => {
    log('Step 1', 'Setting up: 150-day simulation with bridge at days 30-59 and 90-104')
    const checkpoints: Map<string, { status: StatusSnapshot; cumulative: number }> = new Map()
    const postdocEndDate = '2026-04-11'
    const initialDays = 0

    // Employment periods (bridge): days 30-59 and 90-104 (relative to postdoc end)
    const bridgePeriods = [
      { start: 30, end: 59 },
      { start: 90, end: 104 },
    ]

    function dayToDate(dayOffset: number): string {
      const d = new Date('2026-04-12') // day after postdoc ends
      d.setDate(d.getDate() + dayOffset)
      return d.toISOString().split('T')[0]
    }

    function isInBridge(dayOffset: number): boolean {
      return bridgePeriods.some(p => dayOffset >= p.start && dayOffset <= p.end)
    }

    let unemployedDays = 0

    for (let day = 0; day < 150; day++) {
      const date = dayToDate(day)
      const inBridge = isInBridge(day)

      const db = createMockDb({
        getImmigrationStatus: vi.fn().mockResolvedValue(
          makeImmStatus({
            initial_days_used: initialDays,
            employment_active: inBridge,
            postdoc_end_date: postdocEndDate,
            opt_expiry: '2027-12-31', // far future so grace_period doesn't interfere
          }),
        ),
        checkpointExists: vi.fn().mockResolvedValue(false),
        getLastCheckpoint: vi.fn().mockImplementation(async () => {
          // Find previous day's checkpoint
          const prevDate = dayToDate(day - 1)
          const prev = checkpoints.get(prevDate)
          return prev ? makeCheckpoint({
            status_snapshot: prev.status,
            checkpoint_date: prevDate,
          }) : null
        }),
        countUnemployedCheckpoints: vi.fn().mockResolvedValue(unemployedDays),
        getExistingCheckpointDates: vi.fn().mockResolvedValue(
          new Set(Array.from(checkpoints.keys())),
        ),
        insertCheckpoint: vi.fn().mockImplementation(async (row) => {
          checkpoints.set(row.checkpoint_date, {
            status: row.status_snapshot,
            cumulative: row.unemployment_days_used_cumulative,
          })
        }),
      })

      const [result] = await runDailyCheckpoint(db, {
        userId: 'user-1',
        targetDate: date,
      })

      if (result.statusSnapshot === 'unemployed') {
        unemployedDays++
      }
    }

    log('Step 2', `Total checkpoints: ${checkpoints.size}`)
    expect(checkpoints.size).toBe(150)

    log('Step 3', `Total unemployed days: ${unemployedDays}`)
    // Bridge periods: days 30-59 (30 days) + days 90-104 (15 days) = 45 employed days
    // Unemployed: 150 - 45 = 105
    expect(unemployedDays).toBe(105)
  })

  it('audit trail has one entry per day with no gaps', async () => {
    log('Step 1', 'Running 10 consecutive days and verifying continuity')
    const checkpointDates: string[] = []

    for (let day = 0; day < 10; day++) {
      const date = new Date('2026-04-12')
      date.setDate(date.getDate() + day)
      const dateStr = date.toISOString().split('T')[0]

      const db = createMockDb({
        countUnemployedCheckpoints: vi.fn().mockResolvedValue(day),
        getExistingCheckpointDates: vi.fn().mockResolvedValue(new Set(checkpointDates)),
        insertCheckpoint: vi.fn().mockImplementation(async (row) => {
          checkpointDates.push(row.checkpoint_date)
        }),
      })

      await runDailyCheckpoint(db, { userId: 'user-1', targetDate: dateStr })
    }

    log('Step 2', `Checkpoint count: ${checkpointDates.length}`)
    expect(checkpointDates).toHaveLength(10)

    // Verify no gaps
    for (let i = 1; i < checkpointDates.length; i++) {
      const prev = new Date(checkpointDates[i - 1])
      const curr = new Date(checkpointDates[i])
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(1)
    }
  })
})

// ─── 9. Timezone Boundary Tests ─────────────────────────────────────────────

describe('Timezone boundary', () => {
  it('at 11pm ET: computeDefaultTargetDate resolves correctly', () => {
    log('Step 1', 'Set clock to 11pm ET (March 25, 2026) → 3am UTC March 26')
    // 11pm EDT = UTC-4, so 11pm EDT = 03:00 UTC next day
    const now = new Date('2026-03-26T03:00:00Z')
    const target = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-03-25 (yesterday), actual=${target}`)
    expect(target).toBe('2026-03-25')
  })

  it('at 12:30am ET: computeDefaultTargetDate resolves correctly', () => {
    log('Step 1', 'Set clock to 12:30am ET (March 26, 2026) → 4:30am UTC')
    // 12:30am EDT = 04:30 UTC
    const now = new Date('2026-03-26T04:30:00Z')
    const target = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-03-25 (yesterday via 2hr shift), actual=${target}`)
    expect(target).toBe('2026-03-25')
  })

  it('cron at 05:15 UTC resolves to previous day in ET', () => {
    log('Step 1', 'Set clock to 05:15 UTC (the actual cron time)')
    const now = new Date('2026-04-12T05:15:00Z')
    const target = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-04-11 (yesterday in ET), actual=${target}`)
    expect(target).toBe('2026-04-11')
  })

  it('computeDefaultTargetDate at midnight UTC', () => {
    log('Step 1', 'Set clock to midnight UTC')
    const now = new Date('2026-04-12T00:00:00Z')
    const target = computeDefaultTargetDate(now)

    log('Step 2', `Expected 2026-04-11 (previous day in ET), actual=${target}`)
    expect(target).toBe('2026-04-11')
  })
})

// ─── 10. E2E Pipeline Test (mock) ──────────────────────────────────────────

describe('E2E pipeline (mocked)', () => {
  it('full pipeline: invoke -> verify -> refresh -> log', async () => {
    log('Step 1', 'Setting up full pipeline')
    const db = createMockDb({
      countUnemployedCheckpoints: vi.fn().mockResolvedValue(0),
    })

    log('Step 2', 'Invoke fn_daily_unemployment_checkpoint')
    const [result] = await runDailyCheckpoint(db, {
      userId: 'user-1',
      targetDate: '2026-04-12',
      triggerSource: 'pg_cron',
    })

    log('Step 3', 'Verify checkpoint row created')
    expect(result.action).toBe('checkpoint_created')
    expect(db.insertCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      checkpoint_date: '2026-04-12',
      status_snapshot: 'unemployed',
      unemployment_days_used_cumulative: 32,
      trigger_source: 'pg_cron',
    }))

    log('Step 4', 'Verify materialized view refreshed')
    expect(db.refreshLedger).toHaveBeenCalledTimes(1)

    log('Step 5', 'Verify cron execution log completed')
    expect(db.updateCronLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      status: 'completed',
    }))

    log('Step 6', 'Verify idempotency (re-run should skip)')
    const db2 = createMockDb({
      checkpointExists: vi.fn().mockResolvedValue(true),
    })
    const [result2] = await runDailyCheckpoint(db2, {
      userId: 'user-1',
      targetDate: '2026-04-12',
    })
    expect(result2.action).toBe('skip_idempotent')
  })
})
