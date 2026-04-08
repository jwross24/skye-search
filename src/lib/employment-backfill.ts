/**
 * Retroactive Employment End Date — backfill logic for correcting
 * checkpoint rows when a user reports their bridge employment ended
 * in the past.
 *
 * Append-only: original daily_checkpoint rows are NEVER modified.
 * Corrections go into checkpoint_corrections table.
 *
 * The immigration_clock view LEFT JOINs against corrections and uses
 * the latest corrected_status, so these corrections are immediately
 * reflected in days_remaining.
 */

import type { CorrectionRow } from './postdoc-extension'

const MAX_BACKFILL_DAYS = 90

/**
 * Compute correction rows needed when employment ended retroactively.
 *
 * For each day from endDate+1 to today that was logged as 'employed_bridge',
 * produce a correction row marking it as 'unemployed'.
 *
 * @param userId - The user's ID
 * @param endDate - The date employment ended (ISO date string, YYYY-MM-DD)
 * @param today - Today's date (ISO date string, YYYY-MM-DD)
 * @param employedBridgeDates - Checkpoint dates with status 'employed_bridge' in the range
 * @returns Correction rows to insert, or error string if validation fails
 */
export function computeEmploymentEndCorrections(params: {
  userId: string
  endDate: string
  today: string
  employmentStartDate: string | null
  employedBridgeDates: string[]
}): { corrections: CorrectionRow[] } | { error: string } {
  const { userId, endDate, today, employmentStartDate, employedBridgeDates } = params

  // Safety: end date cannot be in the future
  if (endDate > today) {
    return { error: 'End date cannot be in the future' }
  }

  // Safety: end date cannot be before employment start date
  if (employmentStartDate && endDate < employmentStartDate) {
    return { error: 'End date cannot be before employment start date' }
  }

  // Safety: cap backfill to 90 days
  const endMs = new Date(endDate).getTime()
  const todayMs = new Date(today).getTime()
  const daysDiff = Math.floor((todayMs - endMs) / (1000 * 60 * 60 * 24))

  if (daysDiff > MAX_BACKFILL_DAYS) {
    return { error: `Cannot backfill more than ${MAX_BACKFILL_DAYS} days. Contact your administrator for manual review.` }
  }

  const corrections: CorrectionRow[] = employedBridgeDates
    .filter((date) => date > endDate && date <= today)
    .map((date) => ({
      user_id: userId,
      checkpoint_date: date,
      original_status: 'employed_bridge',
      corrected_status: 'unemployed',
      trigger_source: 'retroactive_end_date',
    }))

  return { corrections }
}
