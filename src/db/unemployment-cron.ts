/**
 * Unemployment Cron — TypeScript implementation of fn_daily_unemployment_checkpoint.
 *
 * Mirrors the plpgsql function for:
 * 1. Manual triggers (API route)
 * 2. Testability (Vitest with mocked DB)
 *
 * Production path: pg_cron → plpgsql function (runs in DB, no Next.js dependency)
 * Manual path: Next.js API → this module → Supabase client
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatusSnapshot =
  | 'unemployed'
  | 'employed_postdoc'
  | 'employed_bridge'
  | 'employed_h1b'
  | 'grace_period'
  | 'CONFLICT'

export type TriggerSource = 'pg_cron' | 'manual_backfill' | 'keepalive_gha'

export interface ImmigrationStatusRow {
  user_id: string
  employment_active: boolean
  employment_active_since: string | null
  initial_days_used: number
  postdoc_end_date: string | null
  opt_expiry: string | null
  calibration_date: string | null
}

export interface CheckpointRow {
  id: string
  user_id: string
  checkpoint_date: string
  status_snapshot: StatusSnapshot
  unemployment_days_used_cumulative: number
  trigger_source: TriggerSource
  evidence_notes: string | null
}

export interface ActiveOffer {
  job_id: string
  employer_type: string
  visa_path: string
  start_date: string
}

export interface CronLogRow {
  id: string
  user_id: string
  execution_date: string
  status: 'started' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  error_message: string | null
  unemployment_days_used_before: number | null
  unemployment_days_used_after: number | null
  employment_active_at_check: boolean | null
  trigger_source: TriggerSource
}

// ─── State Machine ──────────────────────────────────────────────────────────

/** Valid transitions: from → [allowed targets] */
export const VALID_TRANSITIONS: Record<StatusSnapshot, StatusSnapshot[]> = {
  employed_postdoc: ['unemployed', 'employed_postdoc'],
  unemployed: ['employed_bridge', 'employed_h1b', 'grace_period', 'unemployed'],
  employed_bridge: ['unemployed', 'employed_h1b', 'grace_period', 'employed_bridge'],
  employed_h1b: ['grace_period', 'employed_h1b'],
  grace_period: ['grace_period'],
  CONFLICT: ['unemployed', 'employed_bridge', 'employed_h1b', 'grace_period', 'CONFLICT'],
}

export function isValidTransition(from: StatusSnapshot, to: StatusSnapshot): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function isIllegalTransition(from: StatusSnapshot, to: StatusSnapshot): boolean {
  if (from === to) return false
  // Explicit illegal transitions
  if (from === 'grace_period' && to === 'employed_bridge') return true
  if (to === 'employed_postdoc' && from !== 'employed_postdoc') return true
  if (from === 'employed_h1b' && to === 'employed_bridge') return true
  return false
}

// ─── Employment Resolution ──────────────────────────────────────────────────

export function resolveEmploymentStatus(params: {
  targetDate: string
  postdocEndDate: string | null
  optExpiry: string | null
  employmentActive: boolean
  activeOffer: ActiveOffer | null
}): StatusSnapshot {
  const { targetDate, postdocEndDate, optExpiry, employmentActive, activeOffer } = params

  // Still in postdoc period
  if (postdocEndDate && targetDate <= postdocEndDate) {
    return 'employed_postdoc'
  }

  // Has accepted offer at qualifying employer that has started
  if (activeOffer && activeOffer.start_date <= targetDate) {
    const isCapExempt =
      activeOffer.visa_path === 'cap_exempt' ||
      ['university', 'nonprofit_research', 'cooperative_institute', 'government_contractor']
        .includes(activeOffer.employer_type)
    return isCapExempt ? 'employed_h1b' : 'employed_bridge'
  }

  // Manual employment toggle ON
  if (employmentActive) {
    return 'employed_bridge'
  }

  // STEM OPT expired
  if (optExpiry && targetDate > optExpiry) {
    return 'grace_period'
  }

  return 'unemployed'
}

// ─── Gap Detection ──────────────────────────────────────────────────────────

/**
 * Find dates between `afterDate` and `beforeDate` that are missing from `existingDates`.
 * Both boundaries exclusive.
 */
export function findMissedDates(
  afterDate: string,
  beforeDate: string,
  existingDates: Set<string>,
): string[] {
  const missed: string[] = []
  const start = new Date(afterDate)
  start.setDate(start.getDate() + 1)
  const end = new Date(beforeDate)

  const cursor = new Date(start)
  while (cursor < end) {
    const dateStr = cursor.toISOString().split('T')[0]
    if (!existingDates.has(dateStr)) {
      missed.push(dateStr)
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return missed
}

// ─── Core Checkpoint Logic ──────────────────────────────────────────────────

/** Database operations interface — injected for testability */
export interface CheckpointDb {
  getImmigrationStatus(userId: string): Promise<ImmigrationStatusRow | null>
  getAllUserIds(): Promise<string[]>
  checkpointExists(userId: string, date: string): Promise<boolean>
  getLastCheckpoint(userId: string, beforeDate: string): Promise<CheckpointRow | null>
  countUnemployedCheckpoints(userId: string, beforeDate: string): Promise<number>
  getExistingCheckpointDates(userId: string, afterDate: string, beforeDate: string): Promise<Set<string>>
  getActiveOffer(userId: string, asOfDate: string): Promise<ActiveOffer | null>
  insertCheckpoint(row: Omit<CheckpointRow, 'id'>): Promise<void>
  insertCronLog(row: Omit<CronLogRow, 'id'>): Promise<string>
  updateCronLog(id: string, updates: Partial<CronLogRow>): Promise<void>
  refreshLedger(): Promise<void>
}

export interface CheckpointParams {
  userId?: string
  targetDate?: string
  triggerSource?: TriggerSource
}

export interface CheckpointResult {
  userId: string
  targetDate: string
  action: 'checkpoint_created' | 'skip_idempotent' | 'error'
  statusSnapshot?: StatusSnapshot
  cumulative?: number
  daysBefore?: number
  employmentActive?: boolean
  gapDates?: string[]
  error?: string
  alert?: 'CRITICAL_150' | 'GAP_DETECTED'
}

/**
 * Compute the target date as the plpgsql function does:
 * ((NOW() - INTERVAL '2 hours') AT TIME ZONE 'America/New_York')::DATE
 * This safely resolves to "yesterday" in Eastern Time regardless of DST.
 */
export function computeDefaultTargetDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  // Format in America/New_York timezone
  const etDate = shifted.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  return etDate // YYYY-MM-DD format
}

export async function runDailyCheckpoint(
  db: CheckpointDb,
  params: CheckpointParams = {},
): Promise<CheckpointResult[]> {
  const targetDate = params.targetDate ?? computeDefaultTargetDate()
  const triggerSource = params.triggerSource ?? 'pg_cron'
  const results: CheckpointResult[] = []

  // Get user IDs to process
  const userIds = params.userId ? [params.userId] : await db.getAllUserIds()

  for (const userId of userIds) {
    const result = await processUserCheckpoint(db, userId, targetDate, triggerSource)
    results.push(result)
  }

  return results
}

async function processUserCheckpoint(
  db: CheckpointDb,
  userId: string,
  targetDate: string,
  triggerSource: TriggerSource,
): Promise<CheckpointResult> {
  // Step 0: Idempotency guard
  const exists = await db.checkpointExists(userId, targetDate)
  if (exists) {
    return {
      userId,
      targetDate,
      action: 'skip_idempotent',
    }
  }

  const immStatus = await db.getImmigrationStatus(userId)
  if (!immStatus) {
    return { userId, targetDate, action: 'error', error: 'No immigration status found' }
  }

  // Start cron log
  const logId = await db.insertCronLog({
    user_id: userId,
    execution_date: targetDate,
    status: 'started',
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
    unemployment_days_used_before: null,
    unemployment_days_used_after: null,
    employment_active_at_check: null,
    trigger_source: triggerSource,
  })

  try {
    // Step 1: Gap detection
    let gapDates: string[] = []
    const gapStartDate = laterDate(immStatus.postdoc_end_date, immStatus.calibration_date)
    if (gapStartDate) {
      const existingDates = await db.getExistingCheckpointDates(userId, gapStartDate, targetDate)
      gapDates = findMissedDates(gapStartDate, targetDate, existingDates)

      if (gapDates.length > 0) {
        await db.updateCronLog(logId, {
          error_message: `GAP_ALERT: missed dates: ${gapDates.join(', ')}`,
        })
      }
    }

    // Step 2: Get previous status
    const prevCheckpoint = await db.getLastCheckpoint(userId, targetDate)
    let prevStatus: StatusSnapshot
    if (prevCheckpoint) {
      prevStatus = prevCheckpoint.status_snapshot
    } else if (immStatus.postdoc_end_date) {
      // First checkpoint: assume postdoc was the prior state
      prevStatus = 'employed_postdoc'
    } else {
      prevStatus = 'unemployed'
    }

    // Step 2a: Check employment
    const activeOffer = await db.getActiveOffer(userId, targetDate)

    // Step 3: Resolve status
    let newStatus = resolveEmploymentStatus({
      targetDate,
      postdocEndDate: immStatus.postdoc_end_date,
      optExpiry: immStatus.opt_expiry,
      employmentActive: immStatus.employment_active,
      activeOffer,
    })

    // Step 3a: Validate state machine transition
    const attemptedStatus = newStatus
    if (prevStatus !== newStatus && isIllegalTransition(prevStatus, newStatus)) {
      newStatus = 'CONFLICT'
      await db.updateCronLog(logId, {
        error_message: `INTEGRITY_ALERT: illegal transition ${prevStatus} -> ${attemptedStatus}`,
      })
    }

    // Step 4: Calculate cumulative
    const unemployedCount = await db.countUnemployedCheckpoints(userId, targetDate)
    const daysBefore = immStatus.initial_days_used + unemployedCount
    let cumulative = daysBefore

    if (newStatus === 'unemployed' && daysBefore < 150) {
      cumulative = daysBefore + 1
    }

    // Build evidence notes
    let evidenceNotes: string | null = null
    if (activeOffer) evidenceNotes = `offer_accepted: ${activeOffer.job_id}`
    else if (immStatus.employment_active) evidenceNotes = 'manual_toggle'
    else if (newStatus === 'employed_postdoc') evidenceNotes = 'postdoc_active'
    else if (newStatus === 'grace_period') evidenceNotes = 'opt_expired'
    else if (newStatus === 'CONFLICT') evidenceNotes = `illegal_transition: ${prevStatus} -> ${attemptedStatus}`

    // Insert checkpoint
    await db.insertCheckpoint({
      user_id: userId,
      checkpoint_date: targetDate,
      status_snapshot: newStatus,
      unemployment_days_used_cumulative: cumulative,
      trigger_source: triggerSource,
      evidence_notes: evidenceNotes,
    })

    // Step 5: Refresh materialized view
    await db.refreshLedger()

    // Step 6: CRITICAL alert at 150
    let alert: CheckpointResult['alert'] | undefined
    if (cumulative >= 150 && daysBefore < 150) {
      alert = 'CRITICAL_150'
      await db.updateCronLog(logId, {
        error_message: 'CRITICAL: unemployment days reached 150',
      })
    }
    if (gapDates.length > 0) {
      alert = alert ?? 'GAP_DETECTED'
    }

    // Step 7: Update cron log
    await db.updateCronLog(logId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      unemployment_days_used_before: daysBefore,
      unemployment_days_used_after: cumulative,
      employment_active_at_check: immStatus.employment_active,
    })

    return {
      userId,
      targetDate,
      action: 'checkpoint_created',
      statusSnapshot: newStatus,
      cumulative,
      daysBefore,
      employmentActive: immStatus.employment_active,
      gapDates,
      alert,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await db.updateCronLog(logId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMsg,
    })
    return { userId, targetDate, action: 'error', error: errorMsg }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return the later of two ISO date strings, or the non-null one, or null. */
function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}
