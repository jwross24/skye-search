'use server'

import { createClient } from '@/db/supabase-server'
import { computeAllScenarios, type ImmigrationState, type ScenarioResult } from '@/lib/what-if-scenarios'

export async function getWhatIfScenarios(): Promise<{ scenarios: ScenarioResult[]; state: ImmigrationState | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { scenarios: [], state: null }

  // Fetch current immigration state
  const { data: imm } = await supabase
    .from('immigration_status')
    .select('initial_days_used, postdoc_end_date, opt_expiry, employment_active')
    .eq('user_id', user.id)
    .single()

  if (!imm || !imm.postdoc_end_date || !imm.opt_expiry) {
    return { scenarios: [], state: null }
  }

  // Get accurate days_used from immigration_clock view (checkpoint-based)
  const { data: clock } = await supabase
    .from('immigration_clock')
    .select('days_remaining')
    .eq('user_id', user.id)
    .maybeSingle()

  const daysUsed = clock?.days_remaining != null
    ? 150 - clock.days_remaining
    : imm.initial_days_used ?? 0

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const state: ImmigrationState = {
    daysUsed,
    postdocEndDate: imm.postdoc_end_date,
    optExpiry: imm.opt_expiry,
    employmentActive: imm.employment_active ?? false,
    today,
  }

  return { scenarios: computeAllScenarios(state), state }
}
