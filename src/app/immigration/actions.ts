'use server'

import { revalidatePath } from 'next/cache'

export interface CalibrationData {
  initial_days_used: number
  dso_confirmed: boolean
  calibration_date: string // ISO date
}

export async function saveCalibration(data: CalibrationData) {
  // Phase 0: seed data handles state client-side.
  // When Supabase is wired up:
  //   UPDATE immigration_status SET
  //     initial_days_used = data.initial_days_used,
  //     initial_days_source = data.dso_confirmed ? 'dso_confirmed' : 'user_reported',
  //     calibration_date = data.calibration_date

  revalidatePath('/immigration')
  return { success: true, data }
}

export async function acknowledgeDisclaimer() {
  // Phase 0: client-side state.
  // When Supabase is wired up:
  //   UPDATE user_preferences SET disclaimer_acknowledged = true

  revalidatePath('/immigration')
  return { success: true }
}
