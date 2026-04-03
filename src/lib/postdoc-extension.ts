/**
 * PostDoc Extension — backfill logic for correcting checkpoint rows
 * when a postdoc end date is extended (new I-20 issued by DSO).
 *
 * Append-only: original daily_checkpoint rows are NEVER modified.
 * Corrections go into checkpoint_corrections table.
 */

export interface CorrectionRow {
  user_id: string
  checkpoint_date: string
  original_status: string
  corrected_status: string
  trigger_source: string
}

/**
 * Compute correction rows needed when a postdoc end date is extended.
 *
 * For each day between old_end+1 and new_end that was logged as 'unemployed',
 * produce a correction row marking it as 'employed_postdoc'.
 *
 * Idempotent: caller should filter out dates that already have corrections.
 */
export function computeExtensionCorrections(params: {
  userId: string
  oldEndDate: string
  newEndDate: string
  unemployedCheckpointDates: string[]
}): CorrectionRow[] {
  const { userId, oldEndDate, newEndDate, unemployedCheckpointDates } = params

  return unemployedCheckpointDates
    .filter((date) => date > oldEndDate && date <= newEndDate)
    .map((date) => ({
      user_id: userId,
      checkpoint_date: date,
      original_status: 'unemployed',
      corrected_status: 'employed_postdoc',
      trigger_source: 'postdoc_extension_backfill',
    }))
}
