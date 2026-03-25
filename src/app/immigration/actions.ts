'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'

export interface CalibrationData {
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
