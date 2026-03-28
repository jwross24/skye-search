/**
 * Budget guard (Deno) — check and enforce API spend limits in Edge Functions.
 * Mirror of src/lib/budget-guard.ts with Deno-compatible imports.
 */

import { getSupabaseAdmin } from './supabase-admin.ts'

export type BudgetVerdict =
  | { action: 'allow' }
  | { action: 'reduce_batch'; maxBatchSize: number; reason: string }
  | { action: 'pause'; reason: string }

interface BudgetCaps {
  daily_cap_cents: number
  weekly_soft_cap_cents: number
  weekly_alert_threshold_cents: number
  pause_buffer_cents: number
}

const DEFAULT_CAPS: BudgetCaps = {
  daily_cap_cents: 300,
  weekly_soft_cap_cents: 1200,
  weekly_alert_threshold_cents: 800,
  pause_buffer_cents: 50,
}

const CRITICAL_TASK_TYPES = new Set([
  'unemployment_cron',
  'deadline_72h',
  'cron_failure',
])

export async function checkBudget(params: {
  userId: string
  taskType: string
  criticality?: 'critical' | 'normal'
}): Promise<BudgetVerdict> {
  if (params.criticality === 'critical' || CRITICAL_TASK_TYPES.has(params.taskType)) {
    return { action: 'allow' }
  }

  const supabase = getSupabaseAdmin()

  // Get today's date in ET
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  // Parallel: daily spend + caps
  const [dailyResult, capsResult] = await Promise.all([
    supabase
      .from('daily_spend')
      .select('total_cents')
      .eq('user_id', params.userId)
      .eq('spend_date', today)
      .maybeSingle(),
    supabase
      .from('users')
      .select('user_preferences')
      .eq('id', params.userId)
      .single(),
  ])

  const dailyCents = dailyResult.data?.total_cents ?? 0
  const budget = (capsResult.data?.user_preferences as Record<string, unknown> | null)?.budget as BudgetCaps | undefined
  const caps = budget ?? DEFAULT_CAPS

  if (dailyCents >= caps.daily_cap_cents) {
    return {
      action: 'pause',
      reason: `Daily spend cap reached ($${(dailyCents / 100).toFixed(2)} / $${(caps.daily_cap_cents / 100).toFixed(2)})`,
    }
  }

  if (dailyCents >= caps.daily_cap_cents - caps.pause_buffer_cents) {
    return {
      action: 'reduce_batch',
      maxBatchSize: 3,
      reason: `Approaching daily cap ($${(dailyCents / 100).toFixed(2)} / $${(caps.daily_cap_cents / 100).toFixed(2)})`,
    }
  }

  return { action: 'allow' }
}
