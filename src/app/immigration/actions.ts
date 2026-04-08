'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'
import { computeExtensionCorrections } from '@/lib/postdoc-extension'
import { computeEmploymentEndCorrections } from '@/lib/employment-backfill'

// Not exported: 'use server' files may only export async functions
interface CalibrationData {
  initial_days_used: number
  dso_confirmed: boolean
  calibration_date: string // ISO date
}

export async function saveCalibration(data: CalibrationData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('immigration_status')
    .upsert({
      user_id: user.id,
      initial_days_used: data.initial_days_used,
      initial_days_source: data.dso_confirmed ? 'dso_confirmed' : 'user_reported',
      calibration_date: data.calibration_date,
    }, { onConflict: 'user_id' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/immigration')
  return { success: true, data }
}

export async function acknowledgeDisclaimer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ disclaimer_acknowledged_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/immigration')
  return { success: true }
}

export async function toggleEmployment(isEmployed: boolean, startDate?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('immigration_status')
    .update({
      employment_active: isEmployed,
      employment_active_since: isEmployed ? new Date().toISOString() : null,
      employment_start_date: isEmployed && startDate ? startDate : null,
    })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/immigration')
  return { success: true }
}

export async function confirmEmployment(
  stillActive: boolean,
  endDate?: string,
): Promise<{ success: boolean; error?: string; backfill_error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (stillActive) {
    // User confirms job is still active — reset 30-day timer
    const { error } = await supabase
      .from('immigration_status')
      .update({ last_employment_confirmed_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/immigration')
    return { success: true }
  }

  // User says job ended — set employment_active=false, store end date
  const updateData: Record<string, unknown> = {
    employment_active: false,
    employment_active_since: null,
    last_employment_confirmed_at: null,
  }
  if (endDate) {
    updateData.employment_end_date = endDate
  }

  const { error } = await supabase
    .from('immigration_status')
    .update(updateData)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  // Retroactive backfill: if endDate is in the past, correct employed_bridge
  // checkpoints to unemployed so the clock reflects the actual end date.
  const today = new Date().toISOString().split('T')[0]
  if (endDate && endDate < today) {
    // Get employment_start_date for validation
    const { data: immRow } = await supabase
      .from('immigration_status')
      .select('employment_start_date')
      .eq('user_id', user.id)
      .single()

    // Find employed_bridge checkpoints after the end date
    const { data: bridgeCheckpoints } = await supabase
      .from('daily_checkpoint')
      .select('checkpoint_date')
      .eq('user_id', user.id)
      .eq('status_snapshot', 'employed_bridge')
      .gt('checkpoint_date', endDate)
      .lte('checkpoint_date', today)

    // Check for existing corrections to avoid duplicates
    const { data: existingCorrections } = await supabase
      .from('checkpoint_corrections')
      .select('checkpoint_date')
      .eq('user_id', user.id)
      .eq('trigger_source', 'retroactive_end_date')
      .gt('checkpoint_date', endDate)
      .lte('checkpoint_date', today)

    const existingDates = new Set(
      (existingCorrections ?? []).map((c) => c.checkpoint_date),
    )

    const result = computeEmploymentEndCorrections({
      userId: user.id,
      endDate,
      today,
      employmentStartDate: immRow?.employment_start_date ?? null,
      employedBridgeDates: (bridgeCheckpoints ?? [])
        .map((c) => c.checkpoint_date)
        .filter((d) => !existingDates.has(d)),
    })

    if ('error' in result) {
      // Safety guard triggered — employment is already toggled off,
      // but backfill is capped. Return the error but don't roll back.
      revalidatePath('/immigration')
      return { success: true, backfill_error: result.error }
    }

    if (result.corrections.length > 0) {
      const { error: corrError } = await supabase
        .from('checkpoint_corrections')
        .insert(result.corrections)
      if (corrError) {
        return { success: false, error: corrError.message }
      }
    }
  }

  revalidatePath('/immigration')
  return { success: true }
}

export async function updatePostdocEndDate(newEndDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // Get current postdoc_end_date
  const { data: immRow } = await supabase
    .from('immigration_status')
    .select('postdoc_end_date')
    .eq('user_id', user.id)
    .single()

  if (!immRow) return { success: false, error: 'No immigration status found' }

  const oldEndDate = immRow.postdoc_end_date
  if (!oldEndDate) return { success: false, error: 'No current postdoc end date set' }

  if (newEndDate <= oldEndDate) {
    return { success: false, error: 'New date must be after your current end date' }
  }

  // Find unemployed checkpoints in the range that would be corrected
  const { data: unemployedCheckpoints } = await supabase
    .from('daily_checkpoint')
    .select('checkpoint_date')
    .eq('user_id', user.id)
    .eq('status_snapshot', 'unemployed')
    .gt('checkpoint_date', oldEndDate)
    .lte('checkpoint_date', newEndDate)

  // Check for existing corrections to avoid duplicates (idempotency)
  const { data: existingCorrections } = await supabase
    .from('checkpoint_corrections')
    .select('checkpoint_date')
    .eq('user_id', user.id)
    .eq('trigger_source', 'postdoc_extension_backfill')
    .gt('checkpoint_date', oldEndDate)
    .lte('checkpoint_date', newEndDate)

  const existingCorrectionDates = new Set(
    (existingCorrections ?? []).map((c) => c.checkpoint_date),
  )

  const corrections = computeExtensionCorrections({
    userId: user.id,
    oldEndDate,
    newEndDate,
    unemployedCheckpointDates: (unemployedCheckpoints ?? [])
      .map((c) => c.checkpoint_date)
      .filter((d) => !existingCorrectionDates.has(d)),
  })

  // Update postdoc_end_date first. If corrections insert then fails, the view
  // already uses the new end date (no days counted as unemployed in the extended
  // range) and the next invocation will insert the missing corrections.
  // Order matters: corrections after end-date update are safe; end-date after
  // corrections would leave the view showing uncorrected days until retry.
  const { error } = await supabase
    .from('immigration_status')
    .update({ postdoc_end_date: newEndDate })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  // Insert correction rows (append-only — original checkpoints untouched)
  if (corrections.length > 0) {
    const { error: corrError } = await supabase
      .from('checkpoint_corrections')
      .insert(corrections)
    if (corrError) return { success: false, error: corrError.message }
  }

  revalidatePath('/immigration')
  return {
    success: true,
    corrections_count: corrections.length,
    old_end_date: oldEndDate,
    new_end_date: newEndDate,
  }
}
